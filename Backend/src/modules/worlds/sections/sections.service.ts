import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const KNOWN_SECTION_TYPES = ['hero', 'products', 'rich_text'];

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.worldSection.create({
      data: {
        worldId,
        type: payload.type,
        config: payload.config || {},
        position,
        enabled: payload.enabled ?? true,
      },
    });
  }

  async update(worldId: string, id: string, data: Partial<{ config: any; enabled: boolean }>) {
    return this.prisma.worldSection.update({ where: { id }, data });
  }

  async remove(worldId: string, id: string) {
    return this.prisma.worldSection.delete({ where: { id } });
  }

  async reorder(worldId: string, positions: Array<{ id: string; position: number }>) {
    // perform all updates in a transaction to guarantee atomic reorder
    const ops = positions.map((p) => this.prisma.worldSection.update({ where: { id: p.id }, data: { position: p.position } }));
    return this.prisma.$transaction(ops);
  }
}
