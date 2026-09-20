import type { DecodedIdToken } from 'firebase-admin/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminProvider } from './firebase-admin.provider';
export declare class AuthService {
    private readonly prisma;
    private readonly firebaseAdminProvider;
    constructor(prisma: PrismaService, firebaseAdminProvider: FirebaseAdminProvider);
    verifyIdToken(idToken: string): Promise<DecodedIdToken>;
    createSession(idToken: string): Promise<string>;
    verifySessionCookie(cookie: string): Promise<DecodedIdToken>;
    revokeSession(firebaseUid: string): Promise<void>;
    findUserByFirebaseUid(firebaseUid: string): Promise<{
        id: string;
        firebaseUid: string;
        email: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
