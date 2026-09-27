/**
 * The one place the HTTP application is assembled.
 *
 * `main.ts` used to do this inline, which meant a verification script had no way
 * to exercise the *actual* production wiring — it could only rebuild a partial
 * app. Keeping the wiring here (and having `main.ts` and the B10 check script both
 * call it) means "the hardening is configured" is a testable claim rather than
 * a claim about a file nobody runs.
 *
 * Order matters and is deliberate:
 *   logger (so everything after it is JSON) → cookie-parser/helmet → versioned
 *   prefix → pipes (validate) → exception filter (normalize errors) → request
 *   interceptor (assign request id before any guard can throw) → guards
 *   (registered as APP_GUARD providers in AppModule) → CORS → docs.
 */
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { FirebaseSessionGuard } from './common/guards/firebase-session.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CORS_CONFIG } from './common/http/cors';
import { JsonLogger } from './common/logging/json-logger';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { createDocsGateMiddleware, isDocsPath } from './docs/docs-gate.middleware';
import { buildOpenApiDocument } from './docs/openapi-document';

export const DOCS_PATH = 'api/docs';

export function configureApp(app: INestApplication): void {
  // §18 — every line from here on is JSON, including Nest's own boot output.
  app.useLogger(new JsonLogger());

  app.use(cookieParser(process.env.COOKIE_SECRET ?? 'yourverse-dev-secret'));
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalPipes(new ZodValidationPipe());
  // §13 — one error shape for the whole API.
  app.useGlobalFilters(new HttpExceptionFilter());
  // §18 — assign the request id before any guard, pipe or service can fail.
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  // Behind exactly one proxy, `req.ip` is the proxy's address unless this is set,
  // which would make every throttled client share one bucket. Opt-in, because a
  // trusted-proxy setting on a directly-exposed app lets clients spoof X-Forwarded-For.
  if (process.env.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', process.env.TRUST_PROXY);
  }

  app.enableCors(CORS_CONFIG);

  setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  // §22 — open in development, behind a session in production. Registered
  // *before* SwaggerModule.setup() so it runs first, and self-filtering so it
  // covers both the HTML UI and the raw JSON document.
  if (process.env.NODE_ENV === 'production' && !process.env.SWAGGER_PUBLIC) {
    const gate = createDocsGateMiddleware(app.get(FirebaseSessionGuard));
    app.use((req: { path: string }, res: Parameters<typeof gate>[1], next: Parameters<typeof gate>[2]) =>
      isDocsPath(req.path) ? gate(req as never, res, next) : next(),
    );
  }

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Yourverse API',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  });
}
