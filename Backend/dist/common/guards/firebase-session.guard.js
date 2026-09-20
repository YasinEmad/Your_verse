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
exports.FirebaseSessionGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("../../modules/auth/auth.service");
let FirebaseSessionGuard = class FirebaseSessionGuard {
    authService;
    prisma;
    constructor(authService, prisma) {
        this.authService = authService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const sessionCookie = request.cookies?.['__session'];
        if (!sessionCookie) {
            throw new common_1.UnauthorizedException('No session cookie');
        }
        const decoded = await this.authService.verifySessionCookie(sessionCookie);
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: decoded.uid },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not provisioned');
        }
        request.user = {
            id: user.id,
            firebaseUid: user.firebaseUid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        };
        return true;
    }
};
exports.FirebaseSessionGuard = FirebaseSessionGuard;
exports.FirebaseSessionGuard = FirebaseSessionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], FirebaseSessionGuard);
//# sourceMappingURL=firebase-session.guard.js.map