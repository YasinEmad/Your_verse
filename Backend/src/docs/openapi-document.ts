/**
 * The OpenAPI document — backend-architecture.md §22.
 *
 * Built by `buildOpenApiDocument()` so the document is a function of the app's
 * routes rather than a checked-in JSON file that quietly stops matching. Tags are
 * derived from each controller's path so the UI groups them the way the URL space
 * is grouped (`/shipping`, `/worlds/:worldId/products`, …), and the security
 * scheme documents how a caller actually authenticates: the HttpOnly
 * `__session` cookie, which is why every protected route is marked cookie-auth
 * and none of them use a bearer token.
 */
import { SwaggerModule, DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { THROTTLE_LIMITS } from '../common/throttling/throttle-profiles';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Yourverse API')
    .setDescription(
      [
        'Multi-World e-commerce platform — Modular Monolith on NestJS (backend-architecture.md §1–§3).',
        '',
        '**Auth.** Session-cookie based. `POST /api/v1/auth/session` exchanges a Firebase ID token for the',
        'HttpOnly `__session` cookie; every route that needs a user reads that cookie (backend §6). There is',
        'no bearer token anywhere in this API.',
        '',
        '**Errors.** Every failure — from a guard, the Zod pipe, or a domain service — has the same shape',
        '(backend §13): `{ "statusCode": number, "code": string, "message": string | string[] }`. Branch on',
        '`code`; `message` is for humans and may be reworded.',
        '',
        `**Rate limits.** Per IP, in-memory (backend §17): ${Object.entries(THROTTLE_LIMITS)
          .map(([tier, limit]) => `${tier} ${limit.limit}/min`)
          .join(', ')}. A throttled request returns 429 with \`code: "TOO_MANY_REQUESTS"\`.`,
        '',
        '**CSRF.** Mutating requests (POST/PUT/PATCH/DELETE) must send `X-Requested-With: yourverse`',
        '(backend §16). All 4xx responses are `403 CSRF_HEADER_MISSING` without it.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth('__session', { type: 'apiKey', in: 'cookie' }, 'cookieAuth')
    .addTag('health', 'Liveness probe')
    .addTag('auth', 'Session issuance, current user, logout (backend §6)')
    .addTag('worlds', 'World identity — Super Admin; storefront read is public (backend §26)')
    .addTag('worlds/:worldId/sections', 'Section composition for a World (backend §26)')
    .addTag('worlds/:worldId/products', 'Catalog read is public; writes need products.* (backend §5)')
    .addTag('worlds/:worldId/categories', 'Category tree per World')
    .addTag('cart', 'Guest- and user-aware cart (backend §6/§7)')
    .addTag('orders', 'Order placement and payment (backend §7, §19–§20)')
    .addTag('shipments', 'Shipping desk: label destination + status (backend §8)')
    .addTag('admin', 'Operational dashboard and audit log (backend §7)')
    .addTag('super-admin', 'Role management, Super Admin only (backend §6)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  return document;
}
