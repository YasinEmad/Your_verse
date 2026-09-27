import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiErrorResponses, ApiZodPaginatedResponse } from '../../docs/decorators';
import { auditLogEntrySchema } from '../../docs/response-schemas';
import { AuditLogService } from './audit.service';

/**
 * Lives under the same `/api/admin` prefix as the dashboard but is gated by
 * `super_admin.audit.read` — SUPER_ADMIN only, deliberately stricter than the
 * dashboard next to it. The audit log is a record of who changed what, which is
 * only meaningful to someone who can also change things.
 */
@ApiTags('admin')
@ApiCookieAuth('cookieAuth')
@Controller('admin')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @ApiOperation({
    summary: 'Audit log, newest first',
    description:
      'One row per business-meaningful mutation (who did what, backend §7). Distinct from the ' +
      'operational JSON logs in §18: this is an audit trail you can page somebody about, and it is read ' +
      'with a session, not scraped from stdout.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '1-based page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Rows per page (default 50)' })
  @ApiZodPaginatedResponse(auditLogEntrySchema, 'A page of audit entries with their acting user')
  @ApiErrorResponses({ auth: true })
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
