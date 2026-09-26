import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException('Only PAID orders can create a shipment');
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

  async listShipments() {
    return this.prisma.shipment.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { order: { include: { user: true } } },
    });
  }

  async updateShipmentStatus(shipmentId: string, patch: { trackingNumber?: string; carrier?: string; status?: string }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const nextStatus = patch.status ?? shipment.status;
    if (!SHIPMENT_STATUS_SET.has(nextStatus)) {
      throw new BadRequestException(`Invalid shipment status: ${nextStatus}`);
    }

    const currentIndex = SHIPMENT_STATUS_ORDER.indexOf(shipment.status as (typeof SHIPMENT_STATUS_ORDER)[number]);
    const nextIndex = SHIPMENT_STATUS_ORDER.indexOf(nextStatus as (typeof SHIPMENT_STATUS_ORDER)[number]);

    if (nextStatus === 'CANCELLED') {
      if (shipment.status === 'DELIVERED') {
        throw new BadRequestException('Cannot cancel a delivered shipment');
      }
    } else {
      if (currentIndex === -1) {
        throw new BadRequestException(`Invalid current shipment status: ${shipment.status}`);
      }

      if (nextIndex === -1) {
        throw new BadRequestException(`Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`);
      }

      if (nextIndex > currentIndex + 1) {
        throw new BadRequestException(
          `Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`,
        );
      }

      if (nextIndex < currentIndex && nextStatus !== 'CANCELLED') {
        throw new BadRequestException(
          `Invalid shipment status transition: ${shipment.status} -> ${nextStatus}`,
        );
      }
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        trackingNumber: patch.trackingNumber ?? shipment.trackingNumber,
        carrier: patch.carrier ?? shipment.carrier,
        status: nextStatus as any,
      },
      include: { order: true },
    });

    await this.auditLogService.record({
      actorUserId: updated.order.userId,
      action: 'shipment.updated',
      entityType: 'Shipment',
      entityId: updated.id,
      metadata: {
        previousStatus: shipment.status,
        nextStatus: updated.status,
        trackingNumber: updated.trackingNumber,
        carrier: updated.carrier,
      },
    });

    return updated;
  }
}
