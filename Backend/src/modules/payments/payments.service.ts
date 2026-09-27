/**
 * Payments — cash on delivery, and nothing else.
 *
 * There is exactly one payment path, so there is deliberately no
 * `PaymentProvider` interface, no provider registry, and no mock implementation
 * behind one. The `Payment` row's `provider` column (a plain string, §9) records
 * which path was used — `CASH_ON_DELIVERY` — as data, not as a pluggable
 * strategy. If a card processor is ever added, that is the moment an interface
 * earns its keep: until then it would be an abstraction with exactly one
 * implementation, which is the shape the architecture doc's §12 note anticipated
 * but that the current product does not need.
 *
 * The consequence that matters: **there is no payment webhook and no
 * checkout-time capture**. `POST /orders` creates the order PROCESSING with a
 * PENDING payment; money changes hands when the courier hands over the parcel,
 * which is `confirmOnDelivery`, called from ShippingService and from nowhere
 * else. Not a controller route — a customer must not be able to mark their own
 * order paid, and no external system exists to call back in (§27).
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import {
  OrderNotPayableException,
  PaymentNotFoundException,
  PaymentStateException,
} from './payments.exceptions';

/** `Payment.status` is a free string column (§9); these are its only two values. */
export const PAYMENT_STATUS = {
  /** Order placed, money not yet collected. The state every COD order starts in. */
  PENDING: 'PENDING',
  /** Collected in cash against delivery. Terminal for a cash payment. */
  PAID: 'PAID',
} as const;

/** Value written to `Payment.provider`. Data, not a strategy — see the file header. */
export const CASH_ON_DELIVERY = 'CASH_ON_DELIVERY';

/**
 * Order states whose payment can still be confirmed. Both mean "placed, not yet
 * paid": PROCESSING is what checkout writes today, PENDING is what orders placed
 * before the COD switch carry.
 */
const CONFIRMABLE_ORDER_STATUSES = new Set<string>(['PROCESSING', 'PENDING']);

export interface ConfirmOnDeliveryContext {
  /** The user who marked the parcel delivered — who the audit row is attributed to. */
  actorUserId?: string;
  /** Recorded in the audit metadata so a payment can be traced to the delivery that caused it. */
  shipmentId?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Creates the PENDING payment row for a freshly placed order.
   *
   * Takes the caller's transaction client rather than using `this.prisma`: the
   * row has to commit or roll back together with the order it belongs to, and a
   * payment surviving an order that never existed is exactly the half-applied
   * state §19 exists to prevent. It is also why this is a method on the service
   * instead of Orders writing `tx.payment.create` itself — the Payment table
   * stays owned by PaymentsModule (§27).
   */
  async createPending(
    tx: Prisma.TransactionClient,
    order: { id: string; total: Prisma.Decimal; currency: string },
  ) {
    return tx.payment.create({
      data: {
        orderId: order.id,
        provider: CASH_ON_DELIVERY,
        // No processor ever hands us a reference, so the order's own id is the
        // reference. The column is NOT NULL, and a value that points back at the
        // real object beats a plausible-looking fake gateway id.
        providerRef: `${CASH_ON_DELIVERY.toLowerCase()}_${order.id}`,
        status: PAYMENT_STATUS.PENDING,
        amount: order.total,
      },
    });
  }

  /**
   * Cash collected: the parcel was delivered, so the payment is PAID and the
   * order advances to PAID. Both writes are one transaction, so an order can
   * never be PAID with a PENDING payment or the reverse.
   *
   * Called by ShippingService when a shipment reaches DELIVERED — the only
   * caller. Re-marking an already-delivered shipment is a no-op that returns the
   * existing payment rather than throwing or writing a second audit row, because
   * the shipping dashboard can re-save a delivered row.
   */
  async confirmOnDelivery(orderId: string, context: ConfirmOnDeliveryContext = {}) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });

      if (!order) {
        throw new OrderNotPayableException();
      }

      if (!order.payment) {
        throw new PaymentNotFoundException(orderId);
      }

      if (order.payment.status === PAYMENT_STATUS.PAID && order.status === 'PAID') {
        return {
          payment: order.payment,
          currency: order.currency,
          previousOrderStatus: order.status,
          changed: false,
        };
      }

      // A cancelled order whose parcel somehow turned up is a real business
      // conflict (goods delivered against a voided order), not something to
      // paper over by quietly marking it paid. Fail loudly and let a human
      // decide — see the note in ShippingService.updateShipmentStatus.
      if (!CONFIRMABLE_ORDER_STATUSES.has(order.status)) {
        throw new PaymentStateException(
          `Order ${orderId} is ${order.status}; a ${order.status.toLowerCase()} order cannot be confirmed as paid on delivery.`,
        );
      }

      const payment = await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: PAYMENT_STATUS.PAID },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      return {
        payment,
        currency: order.currency,
        previousOrderStatus: order.status,
        changed: true,
      };
    });

    if (outcome.changed) {
      await this.auditLogService.record({
        actorUserId: context.actorUserId,
        action: 'payment.confirmed_on_delivery',
        entityType: 'Payment',
        entityId: outcome.payment.id,
        metadata: {
          orderId,
          shipmentId: context.shipmentId ?? null,
          method: CASH_ON_DELIVERY,
          amount: outcome.payment.amount.toString(),
          currency: outcome.currency,
          previousOrderStatus: outcome.previousOrderStatus,
          orderStatus: 'PAID',
        },
      });
    }

    return outcome.payment;
  }
}
