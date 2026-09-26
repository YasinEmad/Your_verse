import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record({
    actorUserId,
    action,
    entityType,
    entityId,
    metadata,
  }: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action,
        entityType,
        entityId,
        metadata: (metadata ?? {}) as any,
      },
    });
  }

  async list(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { actor: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
