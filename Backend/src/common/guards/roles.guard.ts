import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import {
  ErrorCode,
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '../errors/domain.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('roles', context.getHandler()) || [];
    if (!required.length) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) throw new UnauthorizedDomainException(ErrorCode.UNAUTHENTICATED, 'User not authenticated');

    // SUPER_ADMIN always allowed
    if (user.role === 'SUPER_ADMIN') return true;

    if (required.includes(user.role)) return true;

    throw new ForbiddenDomainException(ErrorCode.FORBIDDEN, 'Insufficient role');
  }
}
