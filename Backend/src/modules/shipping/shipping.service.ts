import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderNotShippableException,
  ShipmentNotFoundException,
  ShipmentTransitionException,
} from './shipping.exceptions';
import { AuditLogService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';

const SHIPMENT_STATUS_ORDER = [
  'ORDERED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

const SHIPMENT_STATUS_SET = new Set<string>([
  'ORDERED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

/**
 * Order states a parcel can be opened for. Under cash on delivery that is any
 * placed-but-unpaid order: the parcel is dispatched long before the money is
 * collected, so waiting for PAID would mean nothing is ever shipped.
 */
const SHIPPABLE_ORDER_STATUSES = new Set<string>(['PROCESSING', 'PENDING']);

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Opens the shipment for a freshly placed order (status ORDERED).
   *
   * Accepts the caller's transaction client so checkout can open the parcel in
   * the same transaction that creates the order: an order that exists with
   * nothing to ship is an order nobody can act on, and the fix would otherwise be
   * a repair job rather than a code path. Called with no client it runs on its
   * own, which is what a re-run or an administrative backfill wants.
   *
   * Cash on delivery means the parcel leaves *before* the order is PAID, so this
   * is deliberately reached at PROCESSING rather than at PAID. The order is the
   * caller's to create; the shipment row is this module's to write, which is why
   * the row is written here and not by Orders reaching into the Shipment table.
   */
  async createForOrder(orderId: string, client?: Prisma.TransactionClient) {
    const db = client ?? this.prisma;
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      throw new OrderNotShippableException();
    }

    if (!SHIPPABLE_ORDER_STATUSES.has(order.status)) {
      throw new ShipmentTransitionException(
        `An order in ${order.status} cannot be shipped; only a placed, unpaid order can.`,
      );
    }

    if (order.shipment) {
      return order.shipment;
    }

    const created = await db.shipment.create({
      data: {
        orderId: order.id,
        status: 'ORDERED',
      },
    });

    // Audited only when the shipment is opened outside checkout: inside the
    // transaction the whole checkout is one audit event (`order.created`), and a
    // second row per order would be noise.
    if (!client) {
      await this.auditLogService.record({
        actorUserId: order.userId,
        action: 'shipment.created',
        entityType: 'Shipment',
        entityId: created.id,
        metadata: {
          orderId: order.id,
          status: created.status,
        },
      });
    }

    return created;
  }

  /**
   * The one projection the shipping surface is allowed to see
   * (backend-architecture.md §7 shipping / frontend §30).
   *
   * It deliberately does NOT `include: { user: true }`: a SHIPPING-role user
   * needs a label, not a customer record. Shipping gets order id, order status,
   * how many items are in the box, and the destination captured at checkout —
   * never the customer's email, role, firebaseUid, order totals, or any product
   * row. Anything this dashboard must not show must not be sent to it at all
   * ("enforced backend-side, not just hidden in the UI").
   */
  private shipmentLabelQuery() {
    return {
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            recipientName: true,
            recipientPhone: true,
            shippingAddress: true,
            _count: { select: { items: true } },
          },
        },
      },
    } as const;
  }

  private toShipmentLabel(shipment: {
    id: string;
    orderId: string;
    trackingNumber: string | null;
    carrier: string | null;
    status: string;
    createdAt?: Date;
    updatedAt: Date;
    order: {
      id: string;
      status: string;
      createdAt: Date;
      recipientName: string | null;
      recipientPhone: string | null;
      shippingAddress: unknown;
      _count: { items: number };
    };
  }) {
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      updatedAt: shipment.updatedAt,
      order: {
        id: shipment.order.id,
        status: shipment.order.status,
        placedAt: shipment.order.createdAt,
        itemCount: shipment.order._count.items,
        recipientName: shipment.order.recipientName,
        recipientPhone: shipment.order.recipientPhone,
        shippingAddress: shipment.order.shippingAddress,
      },
    };
  }

  async listShipments() {
    const shipments = await this.prisma.shipment.findMany({
      orderBy: { updatedAt: 'desc' },
      ...this.shipmentLabelQuery(),
    });

    return shipments.map((shipment) => this.toShipmentLabel(shipment));
  }

  async updateShipmentStatus(
    shipmentId: string,
    patch: { trackingNumber?: string; carrier?: string; status?: string },
    actor?: { id: string },
  ) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });

    if (!shipment) {
      throw new ShipmentNotFoundException(shipmentId);
    }

    const nextStatus = patch.status ?? shipment.status;
    if (!SHIPMENT_STATUS_SET.has(nextStatus)) {
      throw new ShipmentTransitionException(`Invalid shipment status: ${nextStatus}`);
    }

    const currentIndex = SHIPMENT_STATUS_ORDER.indexOf(shipment.status as (typeof SHIPMENT_STATUS_ORDER)[number]);
    const nextIndex = SHIPMENT_STATUS_ORDER.indexOf(nextStatus as (typeof SHIPMENT_STATUS_ORDER)[number]);

    if (nextStatus === 'CANCELLED') {
      if (shipment.status === 'DELIVERED') {
        throw new ShipmentTransitionException('Cannot cancel a delivered shipment');
      }
    } else {
      if (currentIndex === -1) {
        throw new ShipmentTransitionException(`Invalid current shipment status: ${shipment.status}`);
      }

      if (nextIndex === -1) {
        throw new ShipmentTransitionException(`Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`);
      }

      if (nextIndex > currentIndex + 1) {
        throw new ShipmentTransitionException(`Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`);
      }

      if (nextIndex < currentIndex && nextStatus !== 'CANCELLED') {
        throw new ShipmentTransitionException(`Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`);
      }
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        // An empty string means "clear this field" in the dashboard, not "store
        // an empty tracking number".
        trackingNumber: (patch.trackingNumber ?? shipment.trackingNumber ?? '').trim() || null,
        carrier: (patch.carrier ?? shipment.carrier ?? '').trim() || null,
        status: nextStatus as any,
      },
      ...this.shipmentLabelQuery(),
    });

    await this.auditLogService.record({
      // The acting shipping/admin user, not the customer the order belongs to —
      // the audit trail must say who moved the parcel.
      actorUserId: actor?.id,
      action: 'shipment.updated',
      entityType: 'Shipment',
      entityId: updated.id,
      metadata: {
        previousStatus: shipment.status,
        nextStatus: updated.status,
        trackingNumber: updated.trackingNumber,
        carrier: updated.carrier,
        orderId: updated.orderId,
      },
    });

    // Delivery is what collects the money. This is the *only* place a payment
    // becomes PAID — there is no webhook and no client-callable route, so a
    // customer cannot mark their own order paid by asking nicely.
    //
    // Only on a real transition into DELIVERED: re-saving a row that is already
    // delivered must not re-run the confirmation (PaymentsService would treat it
    // as a no-op, but not calling it at all is clearer than relying on that).
    if (nextStatus === 'DELIVERED' && shipment.status !== 'DELIVERED') {
      // A failure here (typically: the order was cancelled while the parcel was
      // in flight, so the payment can no longer be confirmed) is allowed to
      // propagate. The delivery is real and the clerk is right that it happened;
      // silently dropping the error would leave a delivered shipment attached to
      // a cancelled order with nobody any the wiser. The shipment is already
      // updated, so the fix is a human decision, not a retry.
      await this.paymentsService.confirmOnDelivery(updated.orderId, {
        actorUserId: actor?.id,
        shipmentId: updated.id,
      });
    }

    return this.toShipmentLabel(updated);
  }
}
