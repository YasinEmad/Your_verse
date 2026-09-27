import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiErrorResponses, ApiZodOkResponse } from '../../docs/decorators';
import { adminDashboardSchema } from '../../docs/response-schemas';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiCookieAuth('cookieAuth')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'Operational counters for the admin dashboard',
    description: 'Requires `products.read`, so an ADMIN or a SHIPPING user can read it; the counters it ' +
      'returns are aggregates, not rows.',
  })
  @ApiZodOkResponse(adminDashboardSchema, 'Counts and totals for the dashboard')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.read')
  @Get('dashboard')
  async getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }
}
