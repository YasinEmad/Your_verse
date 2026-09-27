import { PrismaClient, Prisma, Role, WorldStatus, Direction, ProductStatus } from '@prisma/client';

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

type SeedSection = {
  type: string;
  position: number;
  config: Prisma.InputJsonValue;
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  price: number;
  quantity: number;
  image: string;
};

type SeedWorldInput = {
  slug: string;
  name: string;
  direction: Direction;
  locale: string;
  themeTokens: Prisma.InputJsonObject;
  capabilities: Record<string, boolean>;
  sections: SeedSection[];
  categories: Array<{ slug: string; name: string }>;
  products: SeedProduct[];
};

/**
 * One World's identity + composition, mirroring the way a Super Admin creates the
 * row and an Admin then composes `world_sections`. Section `type`/`config` pairs
 * must satisfy the frontend Section Registry schemas — an invalid config is not
 * an error at the API or database level, it simply fails validation in
 * `renderSection` and the section silently disappears from the page. The
 * `check:f11` regression exists to catch exactly that class of mistake.
 */
async function seedWorld(input: SeedWorldInput) {
  const world = await prisma.world.create({
    data: {
      slug: input.slug,
      name: input.name,
      status: WorldStatus.ACTIVE,
      direction: input.direction,
      locale: input.locale,
      themeTokens: input.themeTokens,
      capabilities: input.capabilities,
    },
  });

  const categoryIds = new Map<string, string>();
  for (const category of input.categories) {
    const created = await prisma.category.create({
      data: { worldId: world.id, slug: category.slug, name: category.name },
    });
    categoryIds.set(category.slug, created.id);
  }

  for (const product of input.products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Product ${product.slug} references unknown category ${product.categorySlug}`);
    }
    await prisma.product.create({
      data: {
        worldId: world.id,
        categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        status: ProductStatus.ACTIVE,
        images: {
          create: [
            { url: `https://example.com/${product.image}.png`, alt: product.name, position: 1 },
          ],
        },
        variants: {
          create: [
            {
              sku: `${product.slug.toUpperCase()}-01`,
              attributes: { material: 'standard' },
              price: product.price,
              inventory: { create: { quantity: product.quantity, reserved: 0 } },
            },
          ],
        },
      },
    });
  }

  await prisma.worldSection.createMany({
    data: input.sections.map((section) => ({
      worldId: world.id,
      type: section.type,
      position: section.position,
      enabled: true,
      config: section.config,
    })),
  });

  return {
    slug: world.slug,
    direction: world.direction,
    sections: input.sections.length,
    products: input.products.length,
  };
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

  const productTwo = await prisma.product.create({
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
          productIds: [productOne.id, productTwo.id],
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

  const extraWorlds = await Promise.all([
    seedWorld({
      slug: 'chess',
      name: 'Chess World',
      direction: Direction.LTR,
      locale: 'en',
      themeTokens: {
        colors: {
          primary: '#92400e',
          accent: '#b45309',
          background: '#f5efe6',
          surface: '#fffdf8',
        },
      },
      capabilities: { hasChessBoard: true, hasProductGrid: true },
      sections: [
        {
          type: 'chess_hero',
          position: 0,
          config: {
            eyebrow: 'Chess World',
            title: 'Play the long game',
            subtitle:
              'Boards, clocks and everyday kit for players who think three moves ahead. Step up to the board and try a position.',
            stats: [
              { label: 'Time control', value: '10 + 0' },
              { label: 'Daily puzzles', value: '12 new' },
              { label: 'Members', value: '18.4k' },
            ],
            ctaLabel: 'Browse the shop',
            ctaHref: '#chess-catalog',
          },
        },
        {
          type: 'chess_board',
          position: 1,
          config: {
            mode: 'puzzle',
            title: 'Open the board',
            showCoordinates: true,
          },
        },
        {
          type: 'feature_section',
          position: 2,
          config: {
            features: [
              { title: 'Tournament sets', body: 'Competition boards and clocks, ready for club nights.', icon: '♜' },
              { title: 'Pieces & storage', body: 'Weighted pieces with travel cases that survive the commute.', icon: '♟' },
              { title: 'Coaching', body: 'Puzzle ladders and annotated games from titled players.', icon: '♞' },
            ],
          },
        },
        {
          type: 'collection',
          position: 3,
          config: {
            collectionSlug: 'club-night-essentials',
          },
        },
      ],
      categories: [
        { slug: 'boards', name: 'Boards & Sets' },
        { slug: 'clocks', name: 'Clocks' },
      ],
      products: [
        {
          name: 'Tournament Folding Board',
          slug: 'tournament-folding-board',
          description: 'Sturdy roll-up vinyl board with a 50 mm square design.',
          categorySlug: 'boards',
          price: 74.5,
          quantity: 12,
          image: 'chess-board',
        },
        {
          name: 'Analog Tournament Clock',
          slug: 'analog-tournament-clock',
          description: 'Mechanical clock with a 5 second delay and a 10 second bonus.',
          categorySlug: 'clocks',
          price: 58,
          quantity: 8,
          image: 'chess-clock',
        },
      ],
    }),
    seedWorld({
      slug: 'arabic',
      name: 'العالم العربي',
      direction: Direction.RTL,
      locale: 'ar',
      themeTokens: {
        colors: {
          primary: '#134e4a',
          accent: '#0f766e',
          background: '#f8f3ee',
          surface: '#ffffff',
        },
      },
      capabilities: { hasProductGrid: true },
      sections: [
        {
          type: 'hero',
          position: 0,
          config: {
            title: 'عالم العربية',
            subtitle: 'تشكيلة مختارة من المنتجات مع شحن سريع ودعم باللغة العربية.',
            imageUrl: 'https://example.com/arabic-hero.png',
          },
        },
        {
          type: 'feature_section',
          position: 1,
          config: {
            features: [
              { title: 'شحن سريع', body: 'توصيل خلال يومي عمل إلى جميع المدن.', icon: '🚚' },
              { title: 'دفع آمن', body: 'وسائل دفع متعددة مع حماية المشتريات.', icon: '🔒' },
              { title: 'دعم بالعربية', body: 'فريق خدمة العملاء متاح طوال الأسبوع.', icon: '💬' },
            ],
          },
        },
        {
          type: 'collection',
          position: 2,
          config: {
            collectionSlug: 'ramadan-collection',
          },
        },
      ],
      categories: [
        { slug: 'apparel', name: 'ملابس' },
        { slug: 'home', name: 'المنزل' },
      ],
      products: [
        {
          name: 'قميص قطني',
          slug: 'cotton-shirt',
          description: 'قميص من القطن الطبيعي بقصة واسعة.',
          categorySlug: 'apparel',
          price: 149,
          quantity: 20,
          image: 'arabic-shirt',
        },
        {
          name: 'طقم قهوة',
          slug: 'coffee-set',
          description: 'طقم تقديم قهوة عربي مع فناجين.',
          categorySlug: 'home',
          price: 210,
          quantity: 9,
          image: 'arabic-coffee',
        },
      ],
    }),
    seedWorld({
      slug: 'gaming',
      name: 'Gaming World',
      direction: Direction.LTR,
      locale: 'en',
      themeTokens: {
        colors: {
          primary: '#7c3aed',
          accent: '#22d3ee',
          background: '#0b1020',
          surface: '#151b30',
        },
      },
      capabilities: { hasProductGrid: true, hasLeaderboards: true },
      sections: [
        {
          type: 'hero',
          position: 0,
          config: {
            title: 'Gear up. Play longer.',
            subtitle: 'Peripherals, streaming setups and teamwear for the sessions that run past midnight.',
            imageUrl: 'https://example.com/gaming-hero.png',
          },
        },
        {
          type: 'feature_section',
          position: 1,
          config: {
            features: [
              { title: 'Esports peripherals', body: 'Low-latency mice, keyboards and headsets used on the tour.', icon: '🎮' },
              { title: 'Streaming setups', body: 'Capture cards, lighting and mounts that survive a full bracket.', icon: '📡' },
              { title: 'Team merch', body: 'Jerseys and hoodies for your five-stack.', icon: '🏆' },
            ],
          },
        },
        {
          type: 'character_showcase',
          position: 2,
          config: {
            characterIds: ['nova-striker', 'ridge-runner', 'cipher-wraith'],
          },
        },
        {
          type: 'collection',
          position: 3,
          config: {
            collectionSlug: 'esports-2026',
          },
        },
      ],
      categories: [
        { slug: 'peripherals', name: 'Peripherals' },
        { slug: 'apparel', name: 'Apparel' },
      ],
      products: [
        {
          name: 'Featherweight Mouse',
          slug: 'featherweight-mouse',
          description: '58 g shell with a 26K sensor and 8K polling.',
          categorySlug: 'peripherals',
          price: 129,
          quantity: 15,
          image: 'gaming-mouse',
        },
        {
          name: 'Pro Team Jersey',
          slug: 'pro-team-jersey',
          description: 'Match-weight jersey with embroidered crest.',
          categorySlug: 'apparel',
          price: 65,
          quantity: 30,
          image: 'gaming-jersey',
        },
      ],
    }),
  ]);

  console.log('Seeded world:', world.slug);
  console.log('Seeded product:', productOne.slug);
  console.log('Seeded user:', user.email);
  for (const extra of extraWorlds) {
    console.log(
      `Seeded world: ${extra.slug} (${extra.sections} sections, ${extra.products} products, ${extra.direction})`,
    );
  }
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
