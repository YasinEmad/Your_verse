import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit.service';

const KNOWN_SECTION_TYPES = ['hero', 'products', 'rich_text'];

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForWorld(worldId: string) {
    return this.prisma.worldSection.findMany({
      where: { worldId },
      orderBy: { position: 'asc' },
    });
  }

  async create(worldId: string, payload: { type: string; config: any; position?: number; enabled?: boolean }) {
    if (!KNOWN_SECTION_TYPES.includes(payload.type)) {
      throw new BadRequestException(`Unknown section type: ${payload.type}`);
    }

    // default position: append to end
    const maxPos = await this.prisma.worldSection.findFirst({
      where: { worldId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = payload.position ?? ((maxPos?.position ?? 0) + 1);

    const created = await this.prisma.worldSection.create({
      data: {
        worldId,
        type: payload.type,
        config: payload.config || {},
        position,
        enabled: payload.enabled ?? true,
      },
    });

    await this.auditLogService.record({
      action: 'world.section.created',
      entityType: 'WorldSection',
      entityId: created.id,
      metadata: { worldId, type: created.type, position: created.position },
    });

    return created;
  }

  async update(worldId: string, id: string, data: Partial<{ config: any; enabled: boolean }>) {
    const before = await this.prisma.worldSection.findUnique({ where: { id } });
    const updated = await this.prisma.worldSection.update({ where: { id }, data });

    await this.auditLogService.record({
      action: 'world.section.updated',
      entityType: 'WorldSection',
      entityId: updated.id,
      metadata: { worldId, before, after: updated },
    });

    return updated;
  }

  async remove(worldId: string, id: string) {
    const before = await this.prisma.worldSection.findUnique({ where: { id } });
    const deleted = await this.prisma.worldSection.delete({ where: { id } });

    await this.auditLogService.record({
      action: 'world.section.deleted',
      entityType: 'WorldSection',
      entityId: deleted.id,
      metadata: { worldId, before, after: null },
    });

    return deleted;
  }

  async reorder(worldId: string, positions: Array<{ id: string; position: number }>) {
    // perform all updates in a transaction to guarantee atomic reorder
    const ops = positions.map((p) => this.prisma.worldSection.update({ where: { id: p.id }, data: { position: p.position } }));
    const updated = await this.prisma.$transaction(ops);

    await this.auditLogService.record({
      action: 'world.section.reordered',
      entityType: 'WorldSection',
      entityId: positions[0]?.id ?? worldId,
      metadata: { worldId, positions, updatedIds: updated.map((item) => item.id) },
    });

    return updated;
  }
}
