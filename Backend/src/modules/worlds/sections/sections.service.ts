import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit.service';
import { InvalidSectionConfigException, SectionNotFoundException } from './sections.exceptions';
import { isKnownSectionType } from './section-types';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** 404 unless the section exists *in this World* — the World scoping is the point. */
  private async findInWorld(worldId: string, id: string) {
    const section = await this.prisma.worldSection.findFirst({ where: { id, worldId } });
    if (!section) {
      throw new SectionNotFoundException(id);
    }
    return section;
  }

  async listForWorld(worldId: string) {
    return this.prisma.worldSection.findMany({
      where: { worldId },
      orderBy: { position: 'asc' },
    });
  }

  async create(worldId: string, payload: { type: string; config: any; position?: number; enabled?: boolean }) {
    if (!isKnownSectionType(payload.type)) {
      throw new InvalidSectionConfigException(`Unknown section type: ${payload.type}`);
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

  /**
   * Scoped by `worldId` on every lookup. The previous version matched on `id`
   * alone, which let a caller with `worlds.sections.update` on *one* World
   * rewrite a section belonging to another — the World boundary in §5 is only
   * worth anything if the id in the URL is checked against the World in the URL.
   */
  async update(worldId: string, id: string, data: Partial<{ config: any; enabled: boolean }>) {
    const before = await this.findInWorld(worldId, id);
    const updated = await this.prisma.worldSection.update({ where: { id: before.id }, data });

    await this.auditLogService.record({
      action: 'world.section.updated',
      entityType: 'WorldSection',
      entityId: updated.id,
      metadata: { worldId, before, after: updated },
    });

    return updated;
  }

  async remove(worldId: string, id: string) {
    const before = await this.findInWorld(worldId, id);
    const deleted = await this.prisma.worldSection.delete({ where: { id: before.id } });

    await this.auditLogService.record({
      action: 'world.section.deleted',
      entityType: 'WorldSection',
      entityId: deleted.id,
      metadata: { worldId, before, after: null },
    });

    return deleted;
  }

  async reorder(worldId: string, positions: Array<{ id: string; position: number }>) {
    // Reject ids that are not in this World before touching anything, so a
    // reorder cannot move a section across the World boundary either.
    await Promise.all(positions.map((entry) => this.findInWorld(worldId, entry.id)));

    // perform all updates in a transaction to guarantee atomic reorder
    const ops = positions.map((p) => this.prisma.worldSection.update({ where: { id: p.id }, data: { position: p.position } }));
    const updated = await this.prisma.$transaction(ops);

    await this.auditLogService.record({
      action: 'world.section.reordered',
      entityType: 'WorldSection',
      entityId: positions[0]?.id ?? worldId,
      metadata: { worldId, positions, updatedIds: updated.map((item) => item.id) },
    });

    // `$transaction` resolves in the order the operations were submitted, which is
    // the caller's array order rather than the new render order. Re-read so the
    // response matches the documented "in the new order" contract.
    return this.listForWorld(worldId);
  }
}
