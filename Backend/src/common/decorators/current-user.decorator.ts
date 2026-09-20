import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SHIPPING';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);
