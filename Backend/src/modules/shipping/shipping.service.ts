import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderNotShippableException,
  ShipmentNotFoundException,
  ShipmentTransitionException,
} from './shipping.exceptions';
import { AuditLogService } from '../audit/audit.service';

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

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      throw new OrderNotShippableException();
    }

    if (order.status !== 'PAID') {
      throw new ShipmentTransitionException('Only PAID orders can create a shipment');
    }

    if (order.shipment) {
      return order.shipment;
    }

    const created = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        status: 'ORDERED',
      },
    });

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

    return this.toShipmentLabel(updated);
  }
}
