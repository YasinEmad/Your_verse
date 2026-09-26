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

  /**
   * Super-Admin listing for the World lifecycle screen (B9/F9): identity fields
   * only, plus a section count so the UI can tell an un-composed World from a
   * live one. Section *composition* (world_sections) is deliberately NOT
   * included — composing a World is Admin's job
   * (backend-architecture.md §26), and this endpoint must not become a second
   * composition editor's data source.
   */
  async list() {
    const worlds = await this.prisma.world.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { sections: true } } },
    });

    return worlds.map((world) => ({
      id: world.id,
      slug: world.slug,
      name: world.name,
      status: world.status,
      direction: world.direction,
      locale: world.locale,
      themeTokens: world.themeTokens,
      capabilities: world.capabilities,
      sectionCount: world._count.sections,
      createdAt: world.createdAt,
    }));
  }

  async create(payload: { slug: string; name: string; locale?: string; direction?: any; themeTokens?: any; capabilities?: any }) {
    // `themeTokens`/`capabilities` are non-nullable Json columns, and `direction`
    // is an enum — so normalize whatever the Super-Admin form sent into values
    // Prisma/Postgres accept instead of failing the whole create on a cosmetic
    // input difference (e.g. the UI's "rtl" vs the enum's "RTL").
    const data: any = {
      slug: payload.slug,
      name: payload.name,
      locale: payload.locale ?? 'en',
      direction: this.normalizeDirection(payload.direction),
      themeTokens: payload.themeTokens ?? {},
      capabilities: payload.capabilities ?? {},
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
    if (!before) {
      throw new NotFoundException('World not found');
    }

    const safe: any = { ...data };
    if (data.direction !== undefined) {
      safe.direction = this.normalizeDirection(data.direction);
    }
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
    if (!existing) {
      throw new NotFoundException('World not found');
    }

    const deleted = await this.prisma.world.delete({ where: { id } });

    await this.auditLogService.record({
      action: 'world.deleted',
      entityType: 'World',
      entityId: deleted.id,
      metadata: { before: existing, after: null },
    });

    return deleted;
  }

  /**
   * The World's `direction` is a Postgres enum (LTR/RTL) but every consumer of
   * the public payload — the store layout's `dir=` attribute, the Super-Admin
   * form's select — speaks lowercase "ltr"/"rtl". Accept either casing and
   * return the enum value; anything unrecognized falls back to LTR rather than
   * crashing the write.
   */
  private normalizeDirection(direction: unknown): 'LTR' | 'RTL' {
    if (typeof direction !== 'string') return 'LTR';
    return direction.toUpperCase() === 'RTL' ? 'RTL' : 'LTR';
  }
}
