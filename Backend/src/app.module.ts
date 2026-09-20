import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorldsModule } from './modules/worlds/worlds.module';
import { SectionsModule } from './modules/worlds/sections/sections.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { AdminModule } from './modules/admin/admin.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    WorldsModule,
    SectionsModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    AdminModule,
    SuperAdminModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
