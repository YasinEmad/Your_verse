import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodListResponse,
  ApiZodOkResponse,
} from '../../docs/decorators';
import { orderSchema } from '../../docs/response-schemas';
import { OrdersService } from './orders.service';

const OrderStatusSchema = z.enum(['PENDING', 'PROCESSING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED']);

/**
 * Cancellation is the only status change this endpoint accepts. Advancing an
 * order to PAID is not a client decision under cash on delivery — it happens
 * when the shipment is marked delivered — and there is no other legal move
 * (REFUNDED implies a charge that never existed), so the enum deliberately has
 * one member.
 */
const UpdateOrderSchema = z
  .object({
    status: z.literal('CANCELLED').optional(),
    recipientName: z.string().trim().max(200).nullable().optional(),
    recipientPhone: z.string().trim().max(40).nullable().optional(),
    shippingAddress: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Provide at least one of status, recipientName, recipientPhone or shippingAddress',
  });

const ListOrdersSchema = z.object({
  status: OrderStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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
      'One transaction (§19): stock is decremented, an Order (PROCESSING) with its items and a PENDING ' +
      'cash-on-delivery payment is created, a Shipment is opened, and the cart is emptied. Any failure rolls ' +
      'all of it back. The order stays PROCESSING until the parcel is delivered — that is when the payment ' +
      'becomes PAID. Requires an Idempotency-Key; replaying the same key returns the original order instead ' +
      'of creating a second one.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Client-generated key (8-200 chars) identifying this checkout attempt. Reuse it verbatim when retrying.',
  })
  @ApiZodCreatedResponse(orderSchema, 'Order created in PROCESSING with a PENDING payment')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard)
  @Post()
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder(user.id, idempotencyKey);
  }

  @ApiOperation({
    summary: 'Orders visible to the caller',
    description:
      'A customer sees their own orders. ADMIN, SUPER_ADMIN and SHIPPING see every order — `orders.read` is ' +
      'held by plain USERs too, so the scoping is by role, not by that permission alone. Optionally filtered by ' +
      'status and paged with limit/offset; the response is a bare array, newest first.',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatusSchema.options })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiZodListResponse(orderSchema, 'Orders, newest first')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('orders.read')
  @Get()
  async listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(ListOrdersSchema)) query: z.infer<typeof ListOrdersSchema>,
  ) {
    return this.ordersService.listOrders(user, query);
  }

  @ApiOperation({
    summary: 'One order, with items, payment and shipment',
    description: "Scoped like the list: another customer's order is a 404, not a 403.",
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(orderSchema, 'The order')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('orders.read')
  @Get(':id')
  async getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user, id);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: 'Cancel an order, or correct its delivery details',
    description:
      'Cancelling is allowed only before payment (PROCESSING or PENDING) and restores the reserved stock in ' +
      'one transaction. Nothing is refunded because nothing was ever charged — the payment row is left ' +
      'untouched at PENDING, which is the honest record of a collection that never happened.',
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateOrderSchema)
  @ApiZodOkResponse(orderSchema, 'The updated order')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('orders.update')
  @Patch(':id')
  async updateOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderSchema)) body: z.infer<typeof UpdateOrderSchema>,
  ) {
    return this.ordersService.updateOrder(user, id, body);
  }
}
