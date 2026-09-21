import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ROLE_PERMISSIONS } from '../authz/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('permissions', context.getHandler()) || [];
    if (!required.length) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const role = user.role as string;
    const allowed = ROLE_PERMISSIONS[role] || [];

    // SUPER_ADMIN wildcard
    if (allowed.includes('*')) return true;

    // required may contain multiple permission strings; require at least one match
    const ok = required.some((p) => allowed.includes(p));
    if (ok) return true;

    throw new ForbiddenException('Insufficient permissions');
  }
}
