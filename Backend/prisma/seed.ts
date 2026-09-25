import { PrismaClient, Role, WorldStatus, Direction, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

function isMissingTableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return String((error as { code?: string }).code) === 'P2021';
}

async function safeDeleteMany(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
}

async function main() {
  await safeDeleteMany(() => prisma.auditLog.deleteMany({}));
  await safeDeleteMany(() => prisma.shipment.deleteMany({}));
  await safeDeleteMany(() => prisma.payment.deleteMany({}));
  await safeDeleteMany(() => prisma.orderItem.deleteMany({}));
  await safeDeleteMany(() => prisma.order.deleteMany({}));
  await safeDeleteMany(() => prisma.cartItem.deleteMany({}));
  await safeDeleteMany(() => prisma.cart.deleteMany({}));
  await safeDeleteMany(() => prisma.inventory.deleteMany({}));
  await safeDeleteMany(() => prisma.productImage.deleteMany({}));
  await safeDeleteMany(() => prisma.productVariant.deleteMany({}));
  await safeDeleteMany(() => prisma.product.deleteMany({}));
  await safeDeleteMany(() => prisma.category.deleteMany({}));
  await safeDeleteMany(() => prisma.worldSection.deleteMany({}));
  await safeDeleteMany(() => prisma.world.deleteMany({}));
  await safeDeleteMany(() => prisma.user.deleteMany({}));

  const world = await prisma.world.create({
    data: {
      slug: 'anime',
      name: 'Anime World',
      status: WorldStatus.ACTIVE,
      direction: Direction.LTR,
      locale: 'en',
      themeTokens: {
        colors: {
          primary: '#ff4d6d',
          accent: '#ffd166',
          background: '#111827',
          surface: '#1f2937',
        },
      },
      capabilities: { hasCharacterShowcase: true, hasProductGrid: true },
    },
  });

  const categoryOne = await prisma.category.create({
    data: {
      worldId: world.id,
      slug: 'apparel',
      name: 'Apparel',
    },
  });

  const categoryTwo = await prisma.category.create({
    data: {
      worldId: world.id,
      slug: 'collectibles',
      name: 'Collectibles',
    },
  });

  const productOne = await prisma.product.create({
    data: {
      worldId: world.id,
      categoryId: categoryOne.id,
      name: 'Hero Tee',
      slug: 'hero-tee',
      description: 'A premium anime-inspired tee.',
      status: ProductStatus.ACTIVE,
      images: {
        create: [{ url: 'https://example.com/hero-tee.png', alt: 'Hero tee', position: 1 }],
      },
      variants: {
        create: [
          {
            sku: 'HERO-TEE-S',
            attributes: { size: 'S', color: 'black' },
            price: 29.99,
            inventory: {
              create: {
                quantity: 10,
                reserved: 0,
              },
            },
          },
          {
            sku: 'HERO-TEE-M',
            attributes: { size: 'M', color: 'black' },
            price: 29.99,
            inventory: {
              create: {
                quantity: 8,
                reserved: 0,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      worldId: world.id,
      categoryId: categoryTwo.id,
      name: 'Figure Stand',
      slug: 'figure-stand',
      description: 'Durable display stand for collectible figures.',
      status: ProductStatus.ACTIVE,
      images: {
        create: [{ url: 'https://example.com/figure-stand.png', alt: 'Figure stand', position: 1 }],
      },
      variants: {
        create: [
          {
            sku: 'FIGURE-STAND-01',
            attributes: { material: 'steel' },
            price: 39.99,
            inventory: {
              create: {
                quantity: 5,
                reserved: 0,
              },
            },
          },
        ],
      },
    },
  });

  await prisma.worldSection.createMany({
    data: [
      {
        worldId: world.id,
        type: 'hero',
        position: 0,
        enabled: true,
        config: {
          title: 'Welcome to Anime World',
          subtitle: 'Discover limited drops and exclusive merch.',
          imageUrl: 'https://example.com/hero-banner.jpg',
        },
      },
      {
        worldId: world.id,
        type: 'product_grid',
        position: 1,
        enabled: true,
        config: {
          title: 'Featured picks',
          limit: 6,
          categorySlug: 'apparel',
        },
      },
      {
        worldId: world.id,
        type: 'collection',
        position: 2,
        enabled: true,
        config: {
          collectionSlug: 'summer-drops',
        },
      },
      {
        worldId: world.id,
        type: 'feature_section',
        position: 3,
        enabled: true,
        config: {
          features: [
            { title: 'Fast Shipping', body: 'Ships worldwide quickly', icon: '🚚' },
            { title: 'Secure Payments', body: 'Multiple providers supported', icon: '🔒' },
          ],
        },
      },
      {
        worldId: world.id,
        type: 'product_comparison',
        position: 4,
        enabled: true,
        config: {
          productIds: [],
        },
      },
      {
        worldId: world.id,
        type: 'character_showcase',
        position: 5,
        enabled: true,
        config: {
          characterIds: ['naruto', 'sasuke', 'sakura'],
        },
      },
    ],
  });

  const user = await prisma.user.create({
    data: {
      firebaseUid: 'seed-user-1',
      email: 'seed.user@example.com',
      displayName: 'Seed User',
      role: Role.USER,
    },
  });

  console.log('Seeded world:', world.slug);
  console.log('Seeded product:', productOne.slug);
  console.log('Seeded user:', user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
