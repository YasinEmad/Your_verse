/**
 * Orders — checkout, the transactional core of the system.
 *
 * Cash on Delivery, and nothing else about payments: `POST /orders` creates an
 * Order in PROCESSING with a PENDING payment, and no money moves until
 * `PaymentsService.confirmOnDelivery` runs because a parcel was delivered. There
 * is no payment method to choose, no gateway, and no webhook to receive — so
 * none of that machinery exists here, and none should be added back without a
 * second payment path to justify it.
 *
 * The order of writes inside the transaction is load-bearing (§19):
 *
 *     validate cart → decrement inventory → create order + items →
 *     create payment → create shipment → clear cart → snapshot response
 *
 * Inventory goes first on purpose: it is the only step whose loss is visible to
 * a customer (stock that never comes back) rather than merely to a report, and
 * having it early in the transaction means a later failure is the *likely* case
 * the rollback test exercises rather than a theoretical one.
 */
import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode, BadRequestDomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { CartService } from '../cart/cart.service';
import { InsufficientInventoryException } from '../cart/cart.exceptions';
import { PaymentsService } from '../payments/payments.service';
import { ShippingService } from '../shipping/shipping.service';
import {
  EmptyCartException,
  IdempotencyKeyConflictException,
  IdempotencyKeyRequiredException,
  MixedCurrencyCartException,
  OrderNotFoundException,
  OrderStateException,
} from './orders.exceptions';

/** Keys are namespaced per endpoint so the same string on two routes cannot collide (§20). */
const CHECKOUT_SCOPE = 'POST /orders';

/** A checkout is retried for minutes, not days; after a day the key is free to be reused. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a claim may sit without a snapshot before it counts as abandoned.
 * A claim is written *outside* the checkout transaction, so a process that dies
 * between the claim and the commit leaves a row that would otherwise block that
 * key forever. Comfortably longer than any real checkout.
 */
const IN_FLIGHT_GRACE_MS = 60_000;

/**
 * Deliberately permissive about content and strict about length: keys are opaque
 * client strings (a uuid, a checkout session id), and the table is indexed on
 * them, so a 10 MB "key" is a denial-of-service vector rather than a feature.
 */
const IDEMPOTENCY_KEY_PATTERN = /^[\w.:-]{8,200}$/;

/**
 * Roles allowed to see orders that are not their own. `orders.read` cannot
 * express this on its own: plain USERs hold it too, for their own list — so the
 * distinction is made here, on the role, and USER is excluded by construction.
 */
const CROSS_CUSTOMER_ORDER_ROLES = new Set<string>(['ADMIN', 'SUPER_ADMIN', 'SHIPPING']);

/**
 * Order states that can still be cancelled. Both are pre-payment: with cash on
 * delivery nothing is ever charged before delivery, so cancelling is an
 * inventory operation with nothing to refund. PAID onwards is closed.
 */
const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [OrderStatus.PROCESSING, OrderStatus.PENDING];

/** What a checkout transaction is allowed to assume about a cart line. */
interface CheckoutCartItem {
  variantId: string;
  quantity: number;
  variant: {
    price: Prisma.Decimal;
    currency: string;
    product: { worldId: string } | null;
    inventory: { id: string } | null;
  } | null;
}

const orderInclude = {
  items: {
    include: { variant: true },
    orderBy: { id: 'asc' },
  },
  payment: true,
  shipment: true,
} as const;

type IdempotencyRow = {
  id: string;
  key: string;
  userId: string | null;
  response: unknown;
  createdAt: Date;
  expiresAt: Date;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly paymentsService: PaymentsService,
    private readonly shippingService: ShippingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ------------------------------------------------------------- checkout

  /**
   * Places the caller's order. Requires an `Idempotency-Key`: a checkout that can
   * be retried safely is the difference between "the user clicked twice" and "the
   * store sold one item twice" (§20).
   */
  async createOrder(userId: string, idempotencyKey: string | undefined) {
    const key = this.normalizeIdempotencyKey(idempotencyKey);

    // Two attempts, and only for one reason: re-taking a key whose claimer died
    // before committing. Every other replay short-circuits on the first pass.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const claim = await this.claimIdempotencyKey(key, userId);

      if (claim.kind === 'replay') {
        return claim.order;
      }

      if (claim.kind === 'abandoned') {
        continue;
      }

      try {
        const placed = await this.runCheckout(claim.id, userId);
        await this.auditLogService.record({
          actorUserId: userId,
          action: 'order.created',
          entityType: 'Order',
          entityId: placed.id,
          metadata: {
            total: placed.total,
            currency: placed.currency,
            itemCount: placed.itemCount,
            paymentStatus: placed.payment?.status ?? null,
            shipmentId: placed.shipment?.id ?? null,
          },
        });
        return placed;
      } catch (error) {
        // A failed checkout must not consume the key: nothing was created, so a
        // retry with the same key has to be allowed to try again. Deleting is
        // best-effort — if this fails too, the client gets 409 and retries later.
        await this.prisma.idempotencyKey
          .delete({ where: { id: claim.id } })
          .catch(() => undefined);
        throw error;
      }
    }

    throw new IdempotencyKeyConflictException(
      'A request with this Idempotency-Key could not be resolved. Retry with a new key.',
    );
  }

  /**
   * The whole of §19 in one transaction. Nothing outside it is written first, and
   * the response snapshot is stored *inside* it, so a key can never point at an
   * order that was rolled back.
   */
  private async runCheckout(claimId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await this.cartService.loadForCheckout(tx, userId);
      if (!cart || cart.items.length === 0) {
        throw new EmptyCartException();
      }

      const items = cart.items as unknown as CheckoutCartItem[];
      this.assertSingleCurrency(items);

      // 1. Take the stock. The `quantity >= n` guard is what makes this safe
      //    under concurrency: two checkouts racing for the last unit both pass
      //    the cart check, and only one of them updates a row. The loser throws,
      //    which rolls its whole transaction back.
      for (const item of items) {
        const inventoryId = item.variant?.inventory?.id;
        if (!inventoryId) {
          throw new InsufficientInventoryException(
            `Variant ${item.variantId} has no inventory record and cannot be sold.`,
          );
        }

        const claimed = await tx.inventory.updateMany({
          where: { id: inventoryId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });

        if (claimed.count !== 1) {
          // Re-read only on the failure path, so the message names what is
          // actually left rather than what the cart believed.
          const current = await tx.inventory.findUnique({
            where: { id: inventoryId },
            select: { quantity: true },
          });
          throw new InsufficientInventoryException(
            current
              ? `Only ${current.quantity} unit(s) left for this item.`
              : 'This item is out of stock.',
          );
        }
      }

      // 2. Money, as Decimal from here to the column (§28) — never a float sum.
      const subtotal = items.reduce(
        (sum, item) => sum.plus(this.toDecimal(item.variant?.price).mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      const tax = new Prisma.Decimal(0);
      const total = subtotal.plus(tax);
      const currency = items[0]?.variant?.currency ?? 'USD';

      // 3. The order. Status is written explicitly rather than left to the column
      //    default so the one state a new COD order can be in is visible here.
      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PROCESSING,
          subtotal,
          tax,
          total,
          currency,
        },
      });

      for (const item of items) {
        const worldId = item.variant?.product?.worldId;
        if (!worldId) {
          throw new BadRequestDomainException(
            ErrorCode.VALIDATION_FAILED,
            `Variant ${item.variantId} is not attached to a world and cannot be ordered.`,
          );
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            // Denormalized at this instant and never re-read: a later price change
            // must not rewrite what the customer agreed to pay (§7 orders).
            worldId,
            quantity: item.quantity,
            unitPrice: this.toDecimal(item.variant?.price),
          },
        });
      }

      // 4. The payment row, PENDING. Written by PaymentsService with this
      //    transaction so it cannot outlive the order.
      await this.paymentsService.createPending(tx, { id: order.id, total, currency });

      // 5. The shipment, ORDERED, so the order is actually fulfillable. Under
      //    cash on delivery the parcel leaves *before* the order is paid, so it
      //    cannot wait for PAID the way a card flow would.
      await this.shippingService.createForOrder(order.id, tx);

      // 6. Empty the cart last: it is the one write whose loss is invisible.
      await this.cartService.clearInTransaction(tx, cart.id);

      const placed = await this.loadOrderPayload(order.id, tx);

      await tx.idempotencyKey.update({
        where: { id: claimId },
        data: { response: placed as unknown as Prisma.InputJsonValue },
      });

      return placed;
    });
  }

  private assertSingleCurrency(items: CheckoutCartItem[]) {
    const currencies = new Set(items.map((item) => item.variant?.currency ?? 'USD'));
    if (currencies.size > 1) {
      // Summing across currencies would produce a confidently wrong total.
      throw new MixedCurrencyCartException([...currencies].sort());
    }
  }

  private toDecimal(value: Prisma.Decimal | null | undefined): Prisma.Decimal {
    if (value === null || value === undefined) {
      return new Prisma.Decimal(0);
    }
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  // ---------------------------------------------------------- idempotency

  private normalizeIdempotencyKey(raw: string | undefined) {
    const key = raw?.trim();
    if (!key) {
      throw new IdempotencyKeyRequiredException(
        'An Idempotency-Key header is required to place an order.',
      );
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new IdempotencyKeyRequiredException(
        'Idempotency-Key must be 8-200 characters of letters, digits, ".", ":", "_" or "-".',
      );
    }
    return key;
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  /**
   * Claims the key by inserting it, rather than looking it up first: two truly
   * simultaneous requests both see "no such key" on a read-then-write, and both
   * place an order. The unique index on (scope, key) is what actually serializes
   * them — the loser's insert fails and it replays the winner's snapshot.
   */
  private async claimIdempotencyKey(
    key: string,
    userId: string,
  ): Promise<
    | { kind: 'claimed'; id: string }
    | { kind: 'replay'; order: unknown }
    | { kind: 'abandoned' }
  > {
    const create = () =>
      this.prisma.idempotencyKey.create({
        data: {
          scope: CHECKOUT_SCOPE,
          key,
          userId,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        },
      });

    try {
      const claim = await create();
      return { kind: 'claimed', id: claim.id };
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }
    }

    const existing = (await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope: CHECKOUT_SCOPE, key } },
    })) as IdempotencyRow | null;

    if (!existing) {
      // Claimed and released between our insert and this read — the winner
      // finished or failed. Re-insert and let the unique index arbitrate again.
      return this.reattach(create);
    }

    // A key identifies one request from one user. Replaying it for someone else
    // would hand back another customer's order, so it is refused outright.
    if (existing.userId && existing.userId !== userId) {
      throw new IdempotencyKeyConflictException(
        'This Idempotency-Key was already used by a different request.',
      );
    }

    const age = Date.now() - existing.createdAt.getTime();

    // Two ways a stored claim stops counting. Expired: the snapshot is a day
    // old, the order it names is long settled, and the key is free to be reused
    // by a client that kept it. Abandoned: claimed but never completed, so its
    // snapshot is empty and the claimer is gone — without this the key would be
    // blocked forever by a process that died mid-checkout.
    if (existing.expiresAt.getTime() <= Date.now() || age > IN_FLIGHT_GRACE_MS) {
      await this.prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => undefined);
      return { kind: 'abandoned' };
    }

    const order = this.readSnapshot(existing);
    if (order) {
      return { kind: 'replay', order };
    }

    throw new IdempotencyKeyConflictException(
      'A request with this Idempotency-Key is still in progress. Retry shortly.',
    );
  }

  /**
   * Re-inserts a key that was released between our failed insert and our read.
   * The unique index arbitrates again, so a second concurrent winner here is
   * still impossible — it just surfaces as a retryable 409 instead of a 500.
   */
  private async reattach(create: () => Promise<{ id: string }>): Promise<{ kind: 'claimed'; id: string }> {
    try {
      const claim = await create();
      return { kind: 'claimed', id: claim.id };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new IdempotencyKeyConflictException(
          'A request with this Idempotency-Key is still in progress. Retry shortly.',
        );
      }
      throw error;
    }
  }

  /** The stored snapshot, or null while the claim is still in flight. */
  private readSnapshot(row: IdempotencyRow) {
    const response = row.response as { id?: unknown } | null;
    return response && typeof response === 'object' && typeof response.id === 'string'
      ? response
      : null;
  }

  // ----------------------------------------------------------------- reads

  /** Own orders for a customer; every order for admin/shipping. */
  async listOrders(
    actor: AuthenticatedUser,
    filters: { status?: OrderStatus; limit?: number; offset?: number } = {},
  ) {
    const orders = await this.prisma.order.findMany({
      where: this.orderScope(actor, filters.status ? { status: filters.status } : undefined),
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
      ...(filters.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters.offset !== undefined ? { skip: filters.offset } : {}),
    });

    return orders.map((order) => this.toOrderPayload(order));
  }

  /**
   * One order. A customer asking for someone else's id gets 404, not 403: the
   * existence of another customer's order is not theirs to learn.
   */
  async getOrder(actor: AuthenticatedUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: this.orderScope(actor, { id: orderId }),
      include: orderInclude,
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return this.toOrderPayload(order);
  }

  private orderScope(actor: AuthenticatedUser, extra: Prisma.OrderWhereInput = {}): Prisma.OrderWhereInput {
    return CROSS_CUSTOMER_ORDER_ROLES.has(actor.role)
      ? { ...extra }
      : { ...extra, userId: actor.id };
  }

  // -------------------------------------------------------------- mutation

  /**
   * The one administrative change to an order: cancel it.
   *
   * Cash on delivery means there is no charge to reverse, so cancellation is
   * exactly two things — put the stock back, and close the order. The payment row
   * is deliberately left alone: it was never collected, and a payment that reads
   * PENDING is the honest record of that. Marking it CANCELLED would imply a
   * payment had been attempted and reversed, which never happened.
   */
  async updateOrder(
    actor: AuthenticatedUser,
    orderId: string,
    patch: { status?: 'CANCELLED'; recipientName?: string | null; recipientPhone?: string | null; shippingAddress?: Record<string, unknown> | null },
  ) {
    const data: Prisma.OrderUpdateInput = {};

    if (patch.recipientName !== undefined) {
      data.recipientName = patch.recipientName;
    }
    if (patch.recipientPhone !== undefined) {
      data.recipientPhone = patch.recipientPhone;
    }
    if (patch.shippingAddress !== undefined) {
      data.shippingAddress =
        (patch.shippingAddress ?? undefined) as Prisma.InputJsonValue | undefined;
    }

    const cancelled = patch.status === 'CANCELLED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });

      if (!order) {
        throw new OrderNotFoundException(orderId);
      }

      if (cancelled) {
        // Conditional update, not read-then-write: whoever lands here first is
        // the only one who restores the stock. Two concurrent cancels cannot
        // both see PROCESSING and both add the units back.
        const claimed = await tx.order.updateMany({
          where: { id: orderId, status: { in: CANCELLABLE_ORDER_STATUSES } },
          data: { ...data, status: OrderStatus.CANCELLED },
        });

        if (claimed.count !== 1) {
          throw new OrderStateException(
            `Order ${orderId} is ${order.status} and can no longer be cancelled.`,
          );
        }

        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      } else {
        await tx.order.update({ where: { id: orderId }, data });
      }

      return this.loadOrderPayload(orderId, tx);
    });

    await this.auditLogService.record({
      actorUserId: actor.id,
      action: cancelled ? 'order.cancelled' : 'order.updated',
      entityType: 'Order',
      entityId: orderId,
      metadata: {
        ...(cancelled ? { previousStatus: 'PROCESSING', inventoryRestored: true } : {}),
        ...(patch.recipientName !== undefined ? { recipientName: patch.recipientName } : {}),
        ...(patch.recipientPhone !== undefined ? { recipientPhone: patch.recipientPhone } : {}),
        ...(patch.shippingAddress !== undefined
          ? { shippingAddressUpdated: true }
          : {}),
      },
    });

    return updated;
  }

  // ------------------------------------------------------------ projection

  /**
   * The wire shape of an order.
   *
   * Money leaves as a `number` even though it is a `Decimal` in the database: a
   * decimal.js value serialises to a JSON *string*, which forces every client to
   * parse money before doing arithmetic with it. Values are exact — they are
   * converted once, from the stored decimal, never summed in floating point.
   */
  private toOrderPayload(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      subtotal: this.toNumber(order.subtotal),
      tax: this.toNumber(order.tax),
      total: this.toNumber(order.total),
      currency: order.currency,
      recipientName: order.recipientName ?? null,
      recipientPhone: order.recipientPhone ?? null,
      shippingAddress: order.shippingAddress ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemCount: (order.items ?? []).reduce((sum: number, item: any) => sum + item.quantity, 0),
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        variantId: item.variantId,
        worldId: item.worldId,
        quantity: item.quantity,
        unitPrice: this.toNumber(item.unitPrice),
        variant: item.variant
          ? {
              id: item.variant.id,
              sku: item.variant.sku,
              price: this.toNumber(item.variant.price),
              currency: item.variant.currency,
              attributes: item.variant.attributes,
            }
          : null,
      })),
      payment: order.payment
        ? {
            id: order.payment.id,
            orderId: order.payment.orderId,
            provider: order.payment.provider,
            providerRef: order.payment.providerRef,
            status: order.payment.status,
            amount: this.toNumber(order.payment.amount),
            createdAt: order.payment.createdAt,
          }
        : null,
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            orderId: order.shipment.orderId,
            status: order.shipment.status,
            trackingNumber: order.shipment.trackingNumber,
            carrier: order.shipment.carrier,
            updatedAt: order.shipment.updatedAt,
          }
        : null,
    };
  }

  private toNumber(value: Prisma.Decimal | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return this.toDecimal(value).toNumber();
  }

  /** Re-reads an order through the supplied client, so the payload is tx-consistent. */
  private async loadOrderPayload(orderId: string, tx: Prisma.TransactionClient) {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }
    return this.toOrderPayload(order);
  }
}
