import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';

export const CreateCategorySchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  parentId: z.string().uuid().nullable().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(worldId: string) {
    return this.prisma.category.findMany({
      where: { worldId },
      include: { parent: true, children: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(worldId: string, data: z.infer<typeof CreateCategorySchema>) {
    if (data.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: data.parentId, worldId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: {
        worldId,
        slug: data.slug,
        name: data.name,
        parentId: data.parentId ?? null,
      },
      include: { parent: true, children: true },
    });
  }

  async update(worldId: string, id: string, data: z.infer<typeof UpdateCategorySchema>) {
    const category = await this.prisma.category.findFirst({
      where: { id, worldId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new NotFoundException('A category cannot be its own parent');
      }

      const parent = await this.prisma.category.findFirst({
        where: { id: data.parentId, worldId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        parentId: data.parentId ?? null,
      },
      include: { parent: true, children: true },
    });
  }

  async remove(worldId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, worldId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.delete({
      where: { id },
      include: { parent: true, children: true },
    });
  }
}
