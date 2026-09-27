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
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodPaginatedResponse, ApiZodOkResponse } from '../../docs/decorators';
import { userDirectoryItemSchema } from '../../docs/response-schemas';
import { SuperAdminService } from './super-admin.service';

const UpdateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'SHIPPING']),
});

@ApiTags('super-admin')
@ApiCookieAuth('cookieAuth')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Paginated user directory (F9's `/super-admin/users`). SUPER_ADMIN-only:
   * seeing other users' roles and being able to change them is the whole point
   * of this surface, so there is no narrower role that may call it.
   */
  @ApiOperation({
    summary: 'Paginated user directory',
    description: 'Roles and identity only — no orders, no carts, no PII beyond what an admin screen needs.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '1-based page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Rows per page (default 20)' })
  @ApiZodPaginatedResponse(userDirectoryItemSchema, 'A page of users')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('users')
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.superAdminService.listUsers({ page, pageSize });
  }

  /**
   * Role changes are the highest-stakes write in the system: they are audited,
   * self-changes are refused (a Super Admin demoting themselves would leave the
   * platform with no way back in), and they get the `writes` throttle tier.
   */
  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: "Change a user's role",
    description:
      'Audited as `user.role.updated`, attributed to the acting admin rather than the target. ' +
      'Refused with 403 SELF_ROLE_CHANGE_FORBIDDEN when the target is the caller.',
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateUserRoleSchema)
  @ApiZodOkResponse(userDirectoryItemSchema, 'The user with its new role')
  @ApiErrorResponses({ auth: true })
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
