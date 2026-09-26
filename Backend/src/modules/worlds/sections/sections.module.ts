import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';

@Module({
	imports: [PrismaModule, AuditModule],
	controllers: [SectionsController],
	providers: [SectionsService],
	exports: [SectionsService],
})
export class SectionsModule {}
