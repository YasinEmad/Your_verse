import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { AuthService } from './auth.service';

type SessionRequestBody = {
  idToken: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body() body: SessionRequestBody,
    @Req() request: Request & { cookies?: Record<string, string>; signedCookies?: Record<string, string> },
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestId = request.signedCookies?.guest_cart_id ?? request.cookies?.guest_cart_id;
    const cookie = await this.authService.createSession(body.idToken, guestId);
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('__session', cookie, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { ok: true };
  }

  @Get('me')
  @UseGuards(FirebaseSessionGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  @Post('logout')
  @UseGuards(FirebaseSessionGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.revokeSession(user.firebaseUid);

    response.clearCookie('__session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { ok: true };
  }
}
