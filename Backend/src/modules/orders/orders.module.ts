import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Depends on Shipping (to open a shipment) and Payments (to create the pending
 * payment row), both inside the checkout transaction. Neither depends back on
 * Orders, so there is no cycle and no `forwardRef` here — the one edge that does
 * point back (Shipping → Payments on delivery) is a different module entirely.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuditModule, CartModule, PaymentsModule, ShippingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
