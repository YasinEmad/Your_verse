import type { Response } from 'express';
import { type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
type SessionRequestBody = {
    idToken: string;
};
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    createSession(body: SessionRequestBody, response: Response): Promise<{
        ok: boolean;
    }>;
    getCurrentUser(user: AuthenticatedUser): {
        id: string;
        email: string;
        displayName: string | null;
        role: "USER" | "ADMIN" | "SUPER_ADMIN" | "SHIPPING";
    };
    logout(user: AuthenticatedUser, response: Response): Promise<{
        ok: boolean;
    }>;
}
export {};
