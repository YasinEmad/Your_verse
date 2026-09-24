import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminProvider } from './firebase-admin.provider';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminProvider: FirebaseAdminProvider,
  ) {}

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    try {
      return await this.firebaseAdminProvider.getAuth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }

  async mergeGuestCartIntoUser(userId: string, guestId: string): Promise<void> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!guestCart) {
      return;
    }

    const userCart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    const targetCart =
      userCart ??
      (await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: { inventory: true },
              },
            },
          },
        },
      }));

    for (const item of guestCart.items) {
      const existing = targetCart.items.find(
        (targetItem) => targetItem.variantId === item.variantId,
      );

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + item.quantity,
          },
        });
        continue;
      }

      await this.prisma.cartItem.create({
        data: {
          cartId: targetCart.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }

    await this.prisma.cart.delete({
      where: { id: guestCart.id },
    });
  }

  async createSession(idToken: string, guestId?: string): Promise<string> {
    const decoded = await this.verifyIdToken(idToken);
    const email = decoded.email ?? `${decoded.uid}@yourverse.local`;

    const user = await this.prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email,
        displayName: decoded.name ?? undefined,
      },
      create: {
        firebaseUid: decoded.uid,
        email,
        displayName: decoded.name ?? null,
        role: 'USER',
      },
    });

    if (guestId) {
      await this.mergeGuestCartIntoUser(user.id, guestId);
    }

    return this.firebaseAdminProvider
      .getAuth()
      .createSessionCookie(idToken, { expiresIn: SESSION_TTL_MS });
  }

  async verifySessionCookie(cookie: string): Promise<DecodedIdToken> {
    try {
      return await this.firebaseAdminProvider
        .getAuth()
        .verifySessionCookie(cookie, true);
    } catch {
      throw new UnauthorizedException('Invalid or revoked session cookie');
    }
  }

  async revokeSession(firebaseUid: string): Promise<void> {
    await this.firebaseAdminProvider.getAuth().revokeRefreshTokens(firebaseUid);
  }

  async findUserByFirebaseUid(firebaseUid: string) {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
    });
  }
}
