import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SuperAdminService } from './super-admin.service';

const UpdateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'SHIPPING']),
});

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Paginated user directory (F9's `/super-admin/users`). SUPER_ADMIN-only:
   * seeing other users' roles and being able to change them is the whole point
   * of this surface, so there is no narrower role that may call it.
   */
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('users')
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.superAdminService.listUsers({ page, pageSize });
  }

  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('users/:id/role')
  async updateUserRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserRoleSchema)) body: z.infer<typeof UpdateUserRoleSchema>,
  ) {
    return this.superAdminService.updateUserRole(id, body.role, actor);
  }
}
