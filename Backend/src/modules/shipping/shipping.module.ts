import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

/**
 * Imports PaymentsModule so a DELIVERED shipment can confirm the cash payment.
 * The dependency is one-way and narrow: Shipping calls the exported
 * `confirmOnDelivery(orderId)` and never reads the Payment model itself, so
 * payment rules stay in Payments (§27).
 */
@Module({
  imports: [PrismaModule, AuthModule, AuditModule, PaymentsModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
