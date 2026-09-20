import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../modules/auth/auth.service';
export declare class FirebaseSessionGuard implements CanActivate {
    private readonly authService;
    private readonly prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
