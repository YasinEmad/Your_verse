/**
 * Swagger gate — backend-architecture.md §22 ("gated behind auth in production").
 *
 * `/api/docs`, `/api/docs-json` and `/api/docs-yaml` are a full map of the API, so they are not
 * something to serve to the public internet: an attacker gets every route, every
 * parameter, and every validation rule for free. In production they require a
 * valid session cookie — any signed-in user, since the document itself is already
 * narrow — and in every other environment they are open, because a developer
 * needs them to be.
 *
 * This is a middleware rather than a guard because `SwaggerModule.setup()`
 * registers plain Express handlers, not Nest routes, so no `@UseGuards()` can
 * reach them.
 */
import type { NextFunction, Request, Response } from 'express';
import { HttpException } from '@nestjs/common';
import { FirebaseSessionGuard } from '../common/guards/firebase-session.guard';

export const DOCS_PATHS = ['/api/docs', '/api/docs-json', '/api/docs-yaml'] as const;

export function isDocsPath(path: string): boolean {
  return DOCS_PATHS.some((base) => path === base || path === `${base}/` || path.startsWith(`${base}/`));
}

/**
 * Returns the middleware, or `undefined` when docs should stay open (non-prod).
 * The `guard` is the real `FirebaseSessionGuard` instance from DI, so this checks
 * the actual session cookie against Firebase rather than trusting a header.
 */
export function createDocsGateMiddleware(guard: FirebaseSessionGuard) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as never);
      next();
    } catch (error) {
      // This middleware runs outside Nest's router, so `HttpExceptionFilter` never
      // sees what it throws and an unhandled throw would become an Express HTML
      // 500. Re-emit the same `{ statusCode, code, message }` the API uses
      // everywhere else (§13), then only fall through for genuinely unexpected
      // errors.
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const body = error.getResponse();
        const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
        res.status(status).json({
          statusCode: status,
          code: payload.code ?? (status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED'),
          message: payload.message ?? error.message,
        });
        return;
      }
      next(error);
    }
  };
}
