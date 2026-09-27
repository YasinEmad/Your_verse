import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SelfRoleChangeException, UserNotFoundException } from './super-admin.exceptions';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Paginated user directory for the Super-Admin role-management screen
   * (F9's `/super-admin/users`). Identity + role + timestamps only — never
   * carts, orders, or any other customer data a role administrator has no
   * reason to see (§ backend "A SHIPPING-role user never receives product/user
   * data ... enforced backend-side").
   */
  async listUsers({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const skip = (safePage - 1) * safePageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  /**
   * `actor` is the Super-Admin performing the change, `userId` the user being
   * changed — the audit row must attribute the action to the actor, otherwise
   * the audit log reads as if every user promoted themselves.
   */
  async updateUserRole(
    userId: string,
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SHIPPING',
    actor?: Pick<AuthenticatedUser, 'id'>,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (actor && actor.id === userId && role !== user.role) {
      // Self-demotion would leave the platform with zero SUPER_ADMINs and no
      // way back in, so it is refused rather than silently allowed.
      throw new SelfRoleChangeException();
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.auditLogService.record({
      actorUserId: actor?.id,
      action: 'user.role.updated',
      entityType: 'User',
      entityId: updated.id,
      metadata: {
        previousRole: user.role,
        nextRole: updated.role,
      },
    });

    return updated;
  }
}
