import * as admin from 'firebase-admin';
export declare class FirebaseAdminProvider {
    private readonly auth;
    constructor();
    getAuth(): admin.auth.Auth;
}
