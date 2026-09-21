import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAdminProvider } from './firebase-admin.provider';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [FirebaseAdminProvider, AuthService, FirebaseSessionGuard, PermissionsGuard],
  exports: [AuthService, FirebaseSessionGuard, PermissionsGuard],
})
export class AuthModule {}
