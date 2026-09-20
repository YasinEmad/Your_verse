import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../modules/auth/auth.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class FirebaseSessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser; cookies?: Record<string, string> }
    >();

    const sessionCookie = request.cookies?.['__session'];
    if (!sessionCookie) {
      throw new UnauthorizedException('No session cookie');
    }

    const decoded = await this.authService.verifySessionCookie(sessionCookie);
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      throw new UnauthorizedException('User not provisioned');
    }

    request.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    return true;
  }
}
