export interface AuthenticatedUser {
    id: string;
    firebaseUid: string;
    email: string;
    displayName: string | null;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SHIPPING';
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
