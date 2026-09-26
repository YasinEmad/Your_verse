import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SHIPPING') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.auditLogService.record({
      actorUserId: userId,
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
