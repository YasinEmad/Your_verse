import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              worldId: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  },
} as const;

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    const maybeNumber = value as { toNumber?: () => number };
    if (typeof maybeNumber.toNumber === 'function') {
      return maybeNumber.toNumber();
    }
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const buildCartPayload = (cart: any) => {
  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + toNumber(item.variant?.price) * item.quantity,
    0,
  );

  return {
    id: cart?.id ?? null,
    userId: cart?.userId ?? null,
    guestId: cart?.guestId ?? null,
    itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    subtotal,
    currency: items[0]?.variant?.currency ?? 'USD',
    items: items.map((item: any) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      product: item.variant?.product
        ? {
            id: item.variant.product.id,
            name: item.variant.product.name,
            slug: item.variant.product.slug,
            status: item.variant.product.status,
            worldId: item.variant.product.worldId,
          }
        : null,
      variant: item.variant
        ? {
            id: item.variant.id,
            sku: item.variant.sku,
            price: toNumber(item.variant.price),
            currency: item.variant.currency,
            attributes: item.variant.attributes,
            inventory: item.variant.inventory
              ? {
                  id: item.variant.inventory.id,
                  quantity: item.variant.inventory.quantity,
                  reserved: item.variant.inventory.reserved,
                  available:
                    item.variant.inventory.quantity - item.variant.inventory.reserved,
                }
              : null,
          }
        : null,
    })),
  };
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCart(
    userId?: string,
    guestId?: string,
    createIfMissing = true,
  ): Promise<any> {
    if (userId) {
      const userCart = await this.prisma.cart.findFirst({
        where: { userId },
        include: cartInclude,
      });

      if (userCart) {
        return userCart;
      }

      if (guestId) {
        const guestCart = await this.prisma.cart.findUnique({
          where: { guestId },
          include: cartInclude,
        });

        if (guestCart) {
          const merged = await this.mergeGuestCartIntoUser(userId, guestId, guestCart);
          return merged;
        }
      }

      if (createIfMissing) {
        return this.prisma.cart.create({
          data: { userId },
          include: cartInclude,
        });
      }

      return null;
    }

    if (!guestId) {
      return null;
    }

    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: cartInclude,
    });

    if (guestCart) {
      return guestCart;
    }

    if (createIfMissing) {
      return this.prisma.cart.create({
        data: { guestId },
        include: cartInclude,
      });
    }

    return null;
  }

  async mergeGuestCartIntoUser(
    userId: string,
    guestId: string,
    guestCart?: any,
  ): Promise<any> {
    const currentGuestCart =
      guestCart ??
      (await this.prisma.cart.findUnique({
        where: { guestId },
        include: cartInclude,
      }));

    if (!currentGuestCart) {
      return this.resolveCart(userId, guestId, true);
    }

    const userCart =
      (await this.prisma.cart.findFirst({
        where: { userId },
        include: cartInclude,
      })) ??
      (await this.prisma.cart.create({
        data: { userId },
        include: cartInclude,
      }));

    for (const item of currentGuestCart.items) {
      const existing = userCart.items.find(
        (targetItem: any) => targetItem.variantId === item.variantId,
      );

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + item.quantity,
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }

    await this.prisma.cart.delete({
      where: { id: currentGuestCart.id },
    });

    return this.prisma.cart.findFirst({
      where: { userId },
      include: cartInclude,
    });
  }

  async getCart(userId?: string, guestId?: string) {
    const cart = await this.resolveCart(userId, guestId, true);
    if (!cart) {
      return buildCartPayload({ id: null, userId: userId ?? null, guestId: guestId ?? null, items: [] });
    }

    return buildCartPayload(cart);
  }

  async addItem(
    userId: string | undefined,
    guestId: string | undefined,
    variantId: string,
    quantity: number,
  ) {
    const cart = await this.resolveCart(userId, guestId, true);

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);
    if (available <= 0 || quantity > available) {
      throw new BadRequestException(
        `Only ${available} units are available for this item.`,
      );
    }

    const existingItem = cart.items.find((item: any) => item.variantId === variantId);
    const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

    if (nextQuantity > available) {
      throw new BadRequestException(
        `Only ${available - (existingItem?.quantity ?? 0)} more units can be added.`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity,
        },
      });
    }

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return buildCartPayload(updatedCart);
  }

  async updateItem(
    userId: string | undefined,
    guestId: string | undefined,
    itemId: string,
    quantity: number,
  ) {
    const cart = await this.resolveCart(userId, guestId, true);

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        variant: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0);
    if (quantity > available) {
      throw new BadRequestException(
        `Only ${available} units are available for this item.`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return buildCartPayload(updatedCart);
  }

  async removeItem(userId: string | undefined, guestId: string | undefined, itemId: string) {
    const cart = await this.resolveCart(userId, guestId, true);

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return buildCartPayload(updatedCart);
  }
}
