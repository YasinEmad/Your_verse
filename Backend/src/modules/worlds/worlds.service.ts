import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorldsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.world.create({ data });
  }

  async patch(id: string, data: Partial<{ name: string; slug: string; status?: any; locale: string; direction?: any; themeTokens: any; capabilities: any }>) {
    const safe: any = { ...data };
    return this.prisma.world.update({ where: { id }, data: safe });
  }

  async remove(id: string) {
    return this.prisma.world.delete({ where: { id } });
  }
}
