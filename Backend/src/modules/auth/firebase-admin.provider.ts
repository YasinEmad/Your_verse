import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminProvider {
  private readonly auth: admin.auth.Auth;

  constructor() {
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        admin.initializeApp({
          projectId: projectId ?? 'demo-yourverse',
        });
      }
    }

    this.auth = admin.auth();
  }

  getAuth(): admin.auth.Auth {
    return this.auth;
  }
}
