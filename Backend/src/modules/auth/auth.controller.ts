import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { ROLE_PERMISSIONS } from '../../common/authz/permissions';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodOkResponse,
} from '../../docs/decorators';
import { okSchema, sessionUserSchema } from '../../docs/response-schemas';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { UserNotProvisionedException } from './auth.exceptions';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { AuthService } from './auth.service';

/**
 * The only body `/auth/session` accepts. Validated here rather than in the
 * service (backend-architecture.md §11): nothing reaches a service unvalidated,
 * and an empty/invalid `idToken` is a 400 with a field-level message instead of
 * an opaque "Invalid Firebase ID token" from deep inside the Admin SDK.
 */
const CreateSessionSchema = z.object({
  idToken: z.string().min(1, 'idToken is required').max(4096, 'idToken is implausibly long'),
});
type CreateSessionDto = z.infer<typeof CreateSessionSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Session exchange (backend-architecture.md §6). Tightest throttle in the app:
   * this mints a 7-day session cookie from an unverified ID token, so it is the
   * endpoint most worth limiting.
   */
  @Throttle({ default: THROTTLE_LIMITS.auth })
  @ApiOperation({
    // No cookie required: this is the route that mints one.
    security: [],
    summary: 'Exchange a Firebase ID token for a session cookie',
    description:
      'Sets the HttpOnly `__session` cookie (SameSite=Lax, 7 days). JIT-provisions a USER row if the ' +
      'firebaseUid is new. Mutating requests must send `X-Requested-With: yourverse` (§16).',
  })
  @ApiZodBody(CreateSessionSchema)
  @ApiZodOkResponse(okSchema, 'Session issued and cookie set')
  @ApiErrorResponses({ validation: true })
  // 200, not Nest's POST default of 201: this exchanges a token for a session and
  // returns the user, it does not create a resource at a new URL.
  @HttpCode(HttpStatus.OK)
  @Post('session')
  async createSession(
    @Body(new ZodValidationPipe(CreateSessionSchema)) body: CreateSessionDto,
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

  /**
   * The session payload the frontend treats as "who am I" for UX
   * (backend-architecture.md §6, frontend §12–13). `permissions` is included
   * so role-gated surfaces (Admin, Super Admin, Shipping) can decide what to
   * render without a second round trip — the same matrix the guards enforce,
   * exposed read-only. A SUPER_ADMIN gets the literal `*` wildcard, so
   * consumers must treat "*" as "everything".
   */
  @ApiOperation({
    summary: 'Current user and effective permissions',
    description:
      'The payload the frontend gates UI on (§12–13). `permissions` is the same matrix the guards enforce; ' +
      'a SUPER_ADMIN receives the literal `*` wildcard. UX only — it grants nothing.',
  })
  @ApiCookieAuth('cookieAuth')
  @ApiZodOkResponse(sessionUserSchema, 'The signed-in user')
  @ApiErrorResponses({ auth: true })
  @Get('me')
  @UseGuards(FirebaseSessionGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    if (!user) {
      throw new UserNotProvisionedException();
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
    };
  }

  @ApiOperation({
    summary: 'Revoke the session and clear the cookie',
    description: 'Revokes the underlying Firebase refresh tokens, so the cookie is dead everywhere, not just here.',
  })
  @ApiCookieAuth('cookieAuth')
  @ApiZodOkResponse(okSchema, 'Session revoked')
  @ApiErrorResponses({ auth: true })
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
