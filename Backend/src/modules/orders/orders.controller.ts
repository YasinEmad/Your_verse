import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiCookieAuth } from '@nestjs/swagger';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodListResponse,
  ApiZodOkResponse,
} from '../../docs/decorators';
import { orderSchema } from '../../docs/response-schemas';
import { OrdersService } from './orders.service';

const PaySchema = z.object({
  provider: z.string(),
  providerRef: z.string(),
  /** Money is a Decimal in the schema (§9 rule 5) and a number on the wire. */
  amount: z.number().positive(),
});

@ApiTags('orders')
@ApiCookieAuth('cookieAuth')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Checkout. The tight non-auth limit: it decrements inventory inside a
   * transaction (§19), and it is the endpoint a "one click, many orders" abuse
   * script wants.
   */
  @Throttle({ default: THROTTLE_LIMITS.orders })
  @ApiOperation({
    summary: 'Place an order from the current cart',
    description:
      'Single transaction: decrement inventory, create Order + OrderItems, clear the cart (§19). ' +
      'The new order starts PENDING until a payment is recorded.',
  })
  @ApiZodCreatedResponse(orderSchema, 'Order created in PENDING state')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard)
  @Post()
  async createOrder(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.createOrder(user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.orders })
  @ApiOperation({ summary: 'Orders belonging to the signed-in user' })
  @ApiZodListResponse(orderSchema, 'The caller\'s orders, newest first')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard)
  @Get()
  async listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listOrders(user.id);
  }

  @ApiOperation({ summary: 'One order, with items, payment and shipment' })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(orderSchema, 'The order')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard)
  @Get(':id')
  async getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user.id, id);
  }

  @Throttle({ default: THROTTLE_LIMITS.orders })
  @ApiOperation({
    summary: 'Record a payment against a PENDING order',
    description:
      'Provider-shaped body, not a card: no raw card data ever reaches this API. Marks the order PAID, ' +
      'creates the Payment row, and creates the Shipment (ORDERED) in the same transaction.',
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(PaySchema)
  @ApiZodOkResponse(orderSchema, 'The paid order, with its payment and shipment')
  @ApiErrorResponses({ auth: true })
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
