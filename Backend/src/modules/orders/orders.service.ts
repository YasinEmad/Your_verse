import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createOrder(userId: string) {
    const cart = await this.cartService.resolveCart(userId, undefined, false);
    if (!cart || !(cart.items?.length > 0)) {
      throw new BadRequestException('Cart is empty');
    }

    // Verify availability
    for (const item of cart.items) {
      const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0);
      if (item.quantity > available) {
        throw new BadRequestException(`Not enough inventory for variant ${item.variantId}`);
      }
    }

    const subtotal = cart.items.reduce(
      (sum: number, item: any) => sum + (item.variant?.price ? Number(item.variant.price) : 0) * item.quantity,
      0,
    );

    const tax = 0;
    const total = subtotal + tax;

    const orderCreate = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          subtotal: subtotal as any,
          tax: tax as any,
          total: total as any,
          currency: cart.items[0]?.variant?.currency ?? 'USD',
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            worldId: item.variant?.product?.worldId ?? '',
            quantity: item.quantity,
            unitPrice: item.variant?.price ?? 0,
          },
        });

        // Reserve inventory
        if (item.variant?.inventory?.id) {
          await tx.inventory.updateMany({
            where: { id: item.variant.inventory.id, quantity: { gte: item.quantity } },
            data: { reserved: { increment: item.quantity } },
          });
        }
      }

      // Remove the cart
      await tx.cart.delete({ where: { id: cart.id } });

      return order;
    });

    await this.auditLogService.record({
      actorUserId: userId,
      action: 'order.created',
      entityType: 'Order',
      entityId: orderCreate.id,
      metadata: {
        subtotal,
        tax,
        total,
        currency: cart.items[0]?.variant?.currency ?? 'USD',
      },
    });

    // Return full order with items
    return this.prisma.order.findUnique({
      where: { id: orderCreate.id },
      include: { items: { include: { variant: { include: { product: true } } } }, payment: true, shipment: true },
    });
  }

  async listOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { variant: { include: { product: true } } } }, payment: true, shipment: true },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { variant: { include: { product: true } } } }, payment: true, shipment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async payOrder(userId: string, orderId: string, provider: string, providerRef: string, amount: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not in pending state');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider,
          providerRef,
          status: 'COMPLETED',
          amount: amount as any,
        },
      });

      // decrement inventory and reserved
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity }, reserved: { decrement: item.quantity } },
        });
      }

      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
    });

    await this.auditLogService.record({
      actorUserId: userId,
      action: 'order.paid',
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        provider,
        providerRef,
        amount,
      },
    });

    await this.shippingService.createForOrder(order.id);

    return this.getOrder(userId, orderId);
  }
}
