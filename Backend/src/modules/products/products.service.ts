import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';

const ProductStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const ProductVariantSchema = z.object({
  sku: z.string().trim().min(1),
  price: z.number().positive(),
  attributes: z.record(z.string(), z.any()).default({}),
  inventory: z
    .object({
      quantity: z.number().int().nonnegative(),
    })
    .optional(),
});

export const CreateProductSchema = z.object({
  worldId: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().default(''),
  status: ProductStatusSchema.optional().default('DRAFT'),
  variants: z.array(ProductVariantSchema).min(1),
});

export const UpdateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  status: ProductStatusSchema.optional(),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value ?? 0);
};

const normalizeProduct = (product: any) => ({
  ...product,
  variants: product.variants?.map((variant: any) => ({
    ...variant,
    price: toNumber(variant.price),
    inventory: variant.inventory ? { ...variant.inventory } : null,
  })),
  images: product.images ?? [],
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(worldId: string, categoryId?: string, status?: string) {
    const effectiveStatus = status ?? 'ACTIVE';

    const products = await this.prisma.product.findMany({
      where: {
        worldId,
        ...(categoryId ? { categoryId } : {}),
        ...(effectiveStatus ? { status: effectiveStatus as any } : {}),
      },
      include: {
        variants: {
          include: { inventory: true },
        },
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map(normalizeProduct);
  }

  async getBySlug(worldId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { worldId, slug },
      include: {
        variants: {
          include: { inventory: true },
        },
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return normalizeProduct(product);
  }

  async create(worldId: string, data: z.infer<typeof CreateProductSchema>) {
    const category = await this.prisma.category.findFirst({
      where: { id: data.categoryId, worldId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const effectiveWorldId = data.worldId ?? worldId;
    if (effectiveWorldId !== worldId) {
      throw new NotFoundException('World mismatch');
    }

    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let index = 1;

    while (await this.prisma.product.findFirst({ where: { worldId, slug } })) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }

    const created = await this.prisma.$transaction(async (tx) =>
      tx.product.create({
        data: {
          worldId,
          categoryId: data.categoryId,
          name: data.name,
          slug,
          description: data.description,
          status: data.status ?? 'DRAFT',
          variants: {
            create: data.variants.map((variant) => ({
              sku: variant.sku,
              price: variant.price,
              attributes: (variant.attributes ?? {}) as any,
              inventory: {
                create: {
                  quantity: variant.inventory?.quantity ?? 0,
                  reserved: 0,
                },
              },
            })),
          },
        },
        include: {
          variants: {
            include: { inventory: true },
          },
          images: { orderBy: { position: 'asc' } },
          category: true,
        },
      }),
    );

    return normalizeProduct(created);
  }

  async update(worldId: string, id: string, data: z.infer<typeof UpdateProductSchema>) {
    const product = await this.prisma.product.findFirst({
      where: { id, worldId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: data.categoryId, worldId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(data.name ? { slug: slugify(data.name) } : {}),
      },
      include: {
        variants: { include: { inventory: true } },
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
    });

    return normalizeProduct(updated);
  }

  async remove(worldId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, worldId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.delete({
      where: { id },
      include: {
        variants: { include: { inventory: true } },
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
    });
  }
}
