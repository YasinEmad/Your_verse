import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const [userCount, orderCount, paidOrderCount, shipmentCount, productCount, worldCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PAID' } }),
      this.prisma.shipment.count(),
      this.prisma.product.count(),
      this.prisma.world.count(),
    ]);

    return {
      users: userCount,
      orders: orderCount,
      paidOrders: paidOrderCount,
      shipments: shipmentCount,
      products: productCount,
      worlds: worldCount,
    };
  }
}
