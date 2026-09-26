import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.read')
  @Get('dashboard')
  async getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }
}
