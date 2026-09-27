import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OptionalFirebaseSessionGuard } from '../../common/guards/optional-firebase-session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodOkResponse } from '../../docs/decorators';
import { cartSchema } from '../../docs/response-schemas';
import { CartService } from './cart.service';

const AddCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

/**
 * Cart (backend-architecture.md §6/§7).
 *
 * Guest-aware: a signed-out visitor gets a `guest_cart_id` HttpOnly cookie, and
 * `AuthService.mergeGuestCartIntoUser` folds that cart into the user's cart at
 * session exchange. The session guard is therefore *optional* here — these routes
 * must work before anyone has signed in.
 *
 * That makes these routes unauthenticated and database-writing, which is why they
 * share the tight `auth` throttle tier rather than the default.
 */
@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getGuestId(
    request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    response: Response,
  ) {
    const guestId =
      request.signedCookies?.guest_cart_id ?? request.cookies?.guest_cart_id;

    if (guestId) {
      return guestId;
    }

    const generatedGuestId = crypto.randomUUID();
    response.cookie('guest_cart_id', generatedGuestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return generatedGuestId;
  }

  @ApiOperation({
    // Guests are first-class here: no cookie is required to use a cart.
    security: [],
    summary: 'The current cart (user or guest)',
    description: 'Issues a `guest_cart_id` cookie when there is no session. An empty cart returns a zeroed payload, not a 404.',
  })
  @ApiZodOkResponse(cartSchema, 'Cart totals, items, and per-variant availability')
  @UseGuards(OptionalFirebaseSessionGuard)
  @Get()
  async getCart(
    @Req() request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestId = this.getGuestId(request, response);
    return this.cartService.getCart(user?.id, guestId);
  }

  @Throttle({ default: THROTTLE_LIMITS.auth })
  @ApiOperation({
    security: [],
    summary: 'Add a variant to the cart',
    description: 'Refused with 400 INSUFFICIENT_INVENTORY when the requested quantity exceeds available (quantity - reserved) stock.',
  })
  @ApiZodBody(AddCartItemSchema)
  @ApiZodOkResponse(cartSchema, 'The updated cart')
  @ApiErrorResponses({ validation: true })
  // 200, not 201: the response is the updated cart, not a new cart-item resource.
  @HttpCode(200)
  @UseGuards(OptionalFirebaseSessionGuard)
  @Post('items')
  async addItem(
    @Req() request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body(new ZodValidationPipe(AddCartItemSchema))
    body: z.infer<typeof AddCartItemSchema>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestId = this.getGuestId(request, response);
    return this.cartService.addItem(user?.id, guestId, body.variantId, body.quantity);
  }

  @Throttle({ default: THROTTLE_LIMITS.auth })
  @ApiOperation({ security: [], summary: 'Set the quantity of a cart item' })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateCartItemSchema)
  @ApiZodOkResponse(cartSchema, 'The updated cart')
  @ApiErrorResponses({ validation: true })
  @UseGuards(OptionalFirebaseSessionGuard)
  @Patch('items/:id')
  async updateItem(
    @Req() request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') itemId: string,
    @Body(new ZodValidationPipe(UpdateCartItemSchema))
    body: z.infer<typeof UpdateCartItemSchema>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestId = this.getGuestId(request, response);
    return this.cartService.updateItem(user?.id, guestId, itemId, body.quantity);
  }

  @Throttle({ default: THROTTLE_LIMITS.auth })
  @ApiOperation({ security: [], summary: 'Remove a cart item' })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(cartSchema, 'The updated cart')
  @UseGuards(OptionalFirebaseSessionGuard)
  @Delete('items/:id')
  async removeItem(
    @Req() request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') itemId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestId = this.getGuestId(request, response);
    return this.cartService.removeItem(user?.id, guestId, itemId);
  }
}
