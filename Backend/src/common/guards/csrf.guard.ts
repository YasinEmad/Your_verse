/**
 * CSRF mitigation — backend-architecture.md §16.
 *
 * `SameSite=Lax` already blocks the cross-site form POSTs that classic CSRF
 * relies on, and every mutation here is non-GET, so this is defense in depth
 * rather than the primary control. It is cheap and it fails closed: a mutating
 * request must carry `X-Requested-With: yourverse`.
 *
 * Why a custom header is enough: a cross-origin attacker can make the browser
 * *send* a form, but cannot make it *add* a header the target didn't set, without
 * first passing CORS preflight — which §15's exact-origin allowlist rejects. So
 * the header's presence proves the request came from code that could read our
 * allowlist, i.e. from the real app.
 *
 * `X-Requested-With` is used rather than a bespoke `X-Yourverse-*` header purely
 * because it is already a de-facto standard name, so existing tooling and
 * libraries recognize it.
 *
 * The guard is global, so a new mutation cannot forget it. A future server-to-
 * server caller (a payment provider webhook, which cannot set custom headers)
 * opts out explicitly with `@SkipCsrf()` and takes responsibility for its own
 * origin verification. No route does today.
 */
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCode, ForbiddenDomainException } from '../errors/domain.exception';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'yourverse';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_CSRF_KEY = 'skipCsrf';

/** Opt a route out of the header requirement (e.g. a signed webhook). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(req.method)) return true;

    const skipped = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipped) return true;

    const header = req.headers[CSRF_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    if (value === CSRF_HEADER_VALUE) return true;

    throw new ForbiddenDomainException(
      ErrorCode.CSRF_HEADER_MISSING,
      `Missing or invalid ${CSRF_HEADER} header. Send "${CSRF_HEADER}: ${CSRF_HEADER_VALUE}" on mutating requests.`,
    );
  }
}
