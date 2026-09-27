import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
// `SectionsController` guards its writes with `FirebaseSessionGuard`. A guard
// referenced by class in `@UseGuards()` is instantiated in the *consuming*
// module's context, so without this import Nest tries to build the guard here and
// fails on its `AuthService` dependency — the app does not boot.
import { AuthModule } from '../../auth/auth.module';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
