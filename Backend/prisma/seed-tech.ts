/**
 * Non-destructive "apply just the Tech World" seed.
 *
 * Unlike `prisma db seed` (seed.ts), which wipes every world, this script only
 * upserts the `tech` World: it deletes that world's own sections, products and
 * categories (and their dependents) and recreates them from the same shape the
 * main seed uses. Every other World — and every cart/order/user row — is left
 * untouched, so it is safe to run against a live database that was seeded when
 * Tech did not exist yet.
 *
 * Run: npm run seed:tech
 */
import 'dotenv/config';
import { PrismaClient, Prisma, Direction, ProductStatus, WorldStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

const SECTIONS: SeedSection[] = [
  {
    type: 'tech_hero',
    position: 0,
    config: {
      eyebrow: 'Tech World',
      title: 'Build your battle station',
      subtitle:
        'Keyboards, displays, audio and desk gear for people who ship fast and play harder. Every order is cash on delivery.',
      stats: [
        { label: 'Keyboards', value: '24' },
        { label: 'Monitors', value: '1 ms' },
        { label: 'Audio', value: 'Hi-Res' },
      ],
      ctaLabel: 'Browse the shop',
      ctaHref: '/tech/products',
    },
  },
  {
    type: 'tech_realms',
    position: 1,
    config: {
      eyebrow: '// choose your signal',
      title: 'Four doorways. One universe.',
      subtitle:
        'Step through whichever one calls to you. Every door opens onto a different corner of the Tech World.',
      ctaLabel: 'Enter',
      realms: [
        {
          title: 'Keyboards',
          blurb: 'Mechanical boards, switches and keycaps — the tactile heart of every desk.',
          href: '/tech/products?category=keyboards',
          icon: 'chip',
          accent: 'cyan',
        },
        {
          title: 'Audio',
          blurb: 'Headphones, mics and monitors for people who listen closely and speak clearly.',
          href: '/tech/products?category=audio',
          icon: 'wave',
          accent: 'violet',
        },
        {
          title: 'Displays',
          blurb: 'Panels that make code, colour and frames look the way they were meant to.',
          href: '/tech/products?category=displays',
          icon: 'orbit',
          accent: 'blue',
        },
        {
          title: 'All Gear',
          blurb: 'Skip the doors and browse the entire Tech World catalogue in one place.',
          href: '/tech/products',
          icon: 'terminal',
          accent: 'fuchsia',
        },
      ],
      ticker: ['Silicon', 'Signal', 'Syntax', 'Circuit', 'Photon', 'Protocol', 'Pixel', 'Voltage'],
    },
  },
  {
    type: 'product_grid',
    position: 2,
    config: {
      title: 'Featured gear',
      limit: 8,
    },
  },
  {
    type: 'feature_section',
    position: 3,
    config: {
      features: [
        { title: '2-day shipping', body: 'Free on orders over $100, tracked to your door.', icon: '📦' },
        { title: '1-year warranty', body: 'Every keyboard, display and driver is covered out of the box.', icon: '🛡️' },
        { title: 'Cash on delivery', body: 'Pay the courier when the parcel arrives. Nothing charged now.', icon: '💵' },
      ],
    },
  },
  {
    type: 'product_grid',
    position: 4,
    config: {
      title: 'Tune in',
      limit: 4,
      categorySlug: 'audio',
    },
  },
];

const CATEGORIES: Array<{ slug: string; name: string }> = [
  { slug: 'keyboards', name: 'Keyboards' },
  { slug: 'audio', name: 'Audio' },
  { slug: 'displays', name: 'Displays' },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Mechanical Keyboard',
    slug: 'mechanical-keyboard',
    description: 'Hot-swappable MX switches, per-key RGB and a gasket-mount aluminium case.',
    categorySlug: 'keyboards',
    price: 159,
    quantity: 20,
    image: 'tech-keyboard',
  },
  {
    name: 'Compact 65% Keyboard',
    slug: 'compact-keyboard',
    description: 'A 65% layout that keeps the arrow cluster and sheds the rest.',
    categorySlug: 'keyboards',
    price: 119,
    quantity: 25,
    image: 'tech-keyboard-compact',
  },
  {
    name: 'Studio Headphones',
    slug: 'studio-headphones',
    description: 'Closed-back over-ears with a flat response and 90 hours of battery.',
    categorySlug: 'audio',
    price: 249,
    quantity: 12,
    image: 'tech-headphones',
  },
  {
    name: 'USB Condenser Mic',
    slug: 'usb-condenser-mic',
    description: 'Cardioid condenser with a built-in pop filter and zero-latency monitoring.',
    categorySlug: 'audio',
    price: 129,
    quantity: 18,
    image: 'tech-mic',
  },
  {
    name: '27" 4K Monitor',
    slug: 'monitor-27-4k',
    description: 'IPS, 98% DCI-P3 and a 144 Hz refresh for code and colour in one panel.',
    categorySlug: 'displays',
    price: 429,
    quantity: 8,
    image: 'tech-monitor',
  },
  {
    name: '15.6" Portable Monitor',
    slug: 'portable-monitor',
    description: 'A USB-C secondary screen that travels with the laptop it plugs into.',
    categorySlug: 'displays',
    price: 199,
    quantity: 14,
    image: 'tech-monitor-portable',
  },
];

async function upsertTechWorld() {
  const existing = await prisma.world.findUnique({ where: { slug: 'tech' } });

  if (existing) {
    await prisma.worldSection.deleteMany({ where: { worldId: existing.id } });
    await prisma.productImage.deleteMany({
      where: { product: { worldId: existing.id } },
    });
    // Cart rows are transient and would otherwise keep a FK to the variants we
    // are about to replace, which blocks the reseed. Order history is left intact.
    await prisma.cartItem.deleteMany({
      where: { variant: { product: { worldId: existing.id } } },
    });
    await prisma.inventory.deleteMany({
      where: { variant: { product: { worldId: existing.id } } },
    });
    await prisma.productVariant.deleteMany({
      where: { product: { worldId: existing.id } },
    });
    await prisma.product.deleteMany({ where: { worldId: existing.id } });
    await prisma.category.deleteMany({ where: { worldId: existing.id } });
  }

  const world = await prisma.world.upsert({
    where: { slug: 'tech' },
    update: {
      name: 'Tech World',
      status: WorldStatus.ACTIVE,
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
      capabilities: { hasProductGrid: true },
    },
    create: {
      slug: 'tech',
      name: 'Tech World',
      status: WorldStatus.ACTIVE,
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
      capabilities: { hasProductGrid: true },
    },
  });

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.category.create({
      data: { worldId: world.id, slug: category.slug, name: category.name },
    });
    categoryIds.set(category.slug, created.id);
  }

  for (const product of PRODUCTS) {
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
    data: SECTIONS.map((section) => ({
      worldId: world.id,
      type: section.type,
      position: section.position,
      enabled: true,
      config: section.config,
    })),
  });

  return {
    slug: world.slug,
    sections: SECTIONS.length,
    products: PRODUCTS.length,
    recreated: Boolean(existing),
  };
}

upsertTechWorld()
  .then((result) => {
    console.log(
      `${result.recreated ? 'Refreshed' : 'Created'} Tech World: ${result.sections} sections, ${result.products} products`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });