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

  async createSession(idToken: string): Promise<string> {
    const decoded = await this.verifyIdToken(idToken);
    const email = decoded.email ?? `${decoded.uid}@yourverse.local`;

    await this.prisma.user.upsert({
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
