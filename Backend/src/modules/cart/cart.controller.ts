import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OptionalFirebaseSessionGuard } from '../../common/guards/optional-firebase-session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CartService } from './cart.service';

const AddCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

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
