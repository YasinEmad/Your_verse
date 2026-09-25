import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
	imports: [PrismaModule, AuthModule, CartModule],
	controllers: [OrdersController],
	providers: [OrdersService],
	exports: [OrdersService],
})
export class OrdersModule {}
