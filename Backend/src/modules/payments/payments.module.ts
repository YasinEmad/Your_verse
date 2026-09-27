import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsService } from './payments.service';

/**
 * No controller, on purpose. The only entry point is `PaymentsService`, and the
 * only caller is ShippingService — so there is no payment webhook to guard, no
 * callback route to authenticate, and no way for a client to mark an order paid.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
