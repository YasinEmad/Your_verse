import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
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

  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserRoleSchema)) body: z.infer<typeof UpdateUserRoleSchema>,
  ) {
    return this.superAdminService.updateUserRole(id, body.role);
  }
}
