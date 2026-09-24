import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalFirebaseSessionGuard } from '../../common/guards/optional-firebase-session.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartController],
  providers: [CartService, OptionalFirebaseSessionGuard],
  exports: [CartService],
})
export class CartModule {}
