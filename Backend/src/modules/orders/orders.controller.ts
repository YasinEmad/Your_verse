import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { OrdersService } from './orders.service';

const PaySchema = z.object({
  provider: z.string(),
  providerRef: z.string(),
  amount: z.number(),
});

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(FirebaseSessionGuard)
  @Post()
  async createOrder(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.createOrder(user.id);
  }

  @UseGuards(FirebaseSessionGuard)
  @Get()
  async listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listOrders(user.id);
  }

  @UseGuards(FirebaseSessionGuard)
  @Get(':id')
  async getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user.id, id);
  }

  @UseGuards(FirebaseSessionGuard)
  @Post(':id/pay')
  async payOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PaySchema)) body: z.infer<typeof PaySchema>,
  ) {
    return this.ordersService.payOrder(user.id, id, body.provider, body.providerRef, body.amount);
  }
}
