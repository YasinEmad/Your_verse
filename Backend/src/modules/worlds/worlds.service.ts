import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class WorldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findBySlug(slug: string) {
    const world = await this.prisma.world.findUnique({
      where: { slug },
      include: { sections: { orderBy: { position: 'asc' } } },
    });
    if (!world) throw new NotFoundException('World not found');

    // map to the exact public shape expected by the frontend
    return {
      id: world.id,
      slug: world.slug,
      name: world.name,
      status: world.status,
      direction: world.direction,
      locale: world.locale,
      themeTokens: world.themeTokens,
      capabilities: world.capabilities,
      sections: world.sections.map((s) => ({
        id: s.id,
        type: s.type,
        position: s.position,
        enabled: s.enabled,
        config: s.config,
      })),
    };
  }

  async create(payload: { slug: string; name: string; locale?: string; direction?: any; themeTokens?: any; capabilities?: any }) {
    const data: any = {
      slug: payload.slug,
      name: payload.name,
      locale: payload.locale,
      direction: payload.direction,
      themeTokens: payload.themeTokens,
      capabilities: payload.capabilities,
    };

    const world = await this.prisma.world.create({ data });

    await this.auditLogService.record({
      action: 'world.created',
      entityType: 'World',
      entityId: world.id,
      metadata: { slug: world.slug, name: world.name },
    });

    return world;
  }

  async patch(id: string, data: Partial<{ name: string; slug: string; status?: any; locale: string; direction?: any; themeTokens: any; capabilities: any }>) {
    const before = await this.prisma.world.findUnique({ where: { id } });
    const safe: any = { ...data };
    const updated = await this.prisma.world.update({ where: { id }, data: safe });

    await this.auditLogService.record({
      action: 'world.updated',
      entityType: 'World',
      entityId: updated.id,
      metadata: {
        before,
        after: updated,
      },
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.world.findUnique({ where: { id } });
    const deleted = await this.prisma.world.delete({ where: { id } });

    await this.auditLogService.record({
      action: 'world.deleted',
      entityType: 'World',
      entityId: deleted.id,
      metadata: { before: existing, after: null },
    });

    return deleted;
  }
}
