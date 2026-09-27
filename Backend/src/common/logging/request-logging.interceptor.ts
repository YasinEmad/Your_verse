/**
 * Request logging with id correlation — backend-architecture.md §18.
 *
 * Every request gets an id, and that id appears in three places: the structured
 * log line, the `X-Request-Id` response header the caller can quote back to us,
 * and the error body path (the exception filter reads `req.requestId` so one
 * failed call is traceable from the client's screenshot to the log line).
 *
 * An inbound `X-Request-Id` is honoured when it is plausibly an id, so an edge
 * proxy or the frontend's own request id survives the hop — but only after being
 * restricted to a safe alphabet and length, because an unsanitised client-supplied
 * value is log injection (newlines, terminal escapes, megabytes of junk).
 *
 * Logged per request: method, path, status, duration, ip, and — only when the
 * session guard has already run — the authenticated user id and role. Never
 * headers, cookies, or bodies.
 */
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export type RequestWithContext = Request & {
  requestId?: string;
  user?: { id: string; role: string };
};

/** A client-supplied id we are willing to echo; anything else gets a fresh uuid. */
export function resolveRequestId(inbound: unknown): string {
  if (typeof inbound === 'string' && SAFE_REQUEST_ID.test(inbound)) {
    return inbound;
  }
  return randomUUID();
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithContext>();
    const res = http.getResponse<Response>();

    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();
    const finish = (status: number, outcome: 'completed' | 'failed', errorCode?: string) => {
      this.logger.log({
        event: 'request',
        outcome,
        requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        status,
        durationMs: Date.now() - startedAt,
        ip: req.ip,
        // present only if this route authenticates the session
        ...(req.user ? { userId: req.user.id, role: req.user.role } : {}),
        ...(errorCode ? { code: errorCode } : {}),
      });
    };

    return next.handle().pipe(
      tap(() => finish(res.statusCode, 'completed')),
      catchError((error: unknown) => {
        const failure = error instanceof HttpException ? error : undefined;
        const status = failure ? failure.getStatus() : res.statusCode || 500;
        const code =
          failure && typeof failure.getResponse() === 'object' && failure.getResponse() !== null
            ? (failure.getResponse() as { code?: unknown }).code
            : undefined;
        finish(status, 'failed', typeof code === 'string' ? code : undefined);
        throw error;
      }),
    );
  }
}
