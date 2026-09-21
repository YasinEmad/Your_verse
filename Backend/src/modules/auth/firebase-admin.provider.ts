import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

function parseServiceAccount(raw: string): {
  project_id?: string;
  client_email?: string;
  private_key?: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  const entries = trimmed
    .slice(1, -1)
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const parsed: Record<string, string> = {};

  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = entry.slice(0, separatorIndex).trim().replace(/^['"]|['"]$/g, '');
    let value = entry.slice(separatorIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    value = value.replace(/\\n/g, '\n');

    if (key && value !== 'undefined') {
      parsed[key] = value;
    }
  }

  const projectId = parsed.project_id;
  const clientEmail = parsed.client_email;
  const privateKey = parsed.private_key;

  return projectId || clientEmail || privateKey ? { project_id: projectId, client_email: clientEmail, private_key: privateKey } : null;
}

@Injectable()
export class FirebaseAdminProvider {
  private readonly auth: admin.auth.Auth;

  constructor() {
    if (!admin.apps.length) {
      const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
      let projectId = process.env.FIREBASE_PROJECT_ID;
      let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (serviceAccountRaw) {
        try {
          const serviceAccount = parseServiceAccount(serviceAccountRaw);
          projectId ??= serviceAccount?.project_id;
          clientEmail ??= serviceAccount?.client_email;
          privateKey ??= serviceAccount?.private_key?.replace(/\\n/g, '\n');
        } catch {
          // Ignore invalid format; fallback to the explicit individual env vars.
        }
      }

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
