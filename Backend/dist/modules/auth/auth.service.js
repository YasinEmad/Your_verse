"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const firebase_admin_provider_1 = require("./firebase-admin.provider");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let AuthService = class AuthService {
    prisma;
    firebaseAdminProvider;
    constructor(prisma, firebaseAdminProvider) {
        this.prisma = prisma;
        this.firebaseAdminProvider = firebaseAdminProvider;
    }
    async verifyIdToken(idToken) {
        try {
            return await this.firebaseAdminProvider.getAuth().verifyIdToken(idToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid Firebase ID token');
        }
    }
    async createSession(idToken) {
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
    async verifySessionCookie(cookie) {
        try {
            return await this.firebaseAdminProvider
                .getAuth()
                .verifySessionCookie(cookie, true);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or revoked session cookie');
        }
    }
    async revokeSession(firebaseUid) {
        await this.firebaseAdminProvider.getAuth().revokeRefreshTokens(firebaseUid);
    }
    async findUserByFirebaseUid(firebaseUid) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        firebase_admin_provider_1.FirebaseAdminProvider])
], AuthService);
//# sourceMappingURL=auth.service.js.map