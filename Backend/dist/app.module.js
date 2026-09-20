"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const worlds_module_1 = require("./modules/worlds/worlds.module");
const sections_module_1 = require("./modules/worlds/sections/sections.module");
const products_module_1 = require("./modules/products/products.module");
const categories_module_1 = require("./modules/categories/categories.module");
const cart_module_1 = require("./modules/cart/cart.module");
const orders_module_1 = require("./modules/orders/orders.module");
const payments_module_1 = require("./modules/payments/payments.module");
const shipping_module_1 = require("./modules/shipping/shipping.module");
const admin_module_1 = require("./modules/admin/admin.module");
const super_admin_module_1 = require("./modules/super-admin/super-admin.module");
const audit_module_1 = require("./modules/audit/audit.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            worlds_module_1.WorldsModule,
            sections_module_1.SectionsModule,
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            cart_module_1.CartModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            shipping_module_1.ShippingModule,
            admin_module_1.AdminModule,
            super_admin_module_1.SuperAdminModule,
            audit_module_1.AuditModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map