import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLogService } from './audit.service';

@Controller('admin')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('super_admin.audit.read')
  @Get('audit-log')
  async listAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.auditLogService.list(page, pageSize);
  }
}
