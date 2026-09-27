/**
 * Throttler configuration — backend-architecture.md §17.
 *
 * A single global profile (`default`, 300/min) is backed by an in-memory store,
 * which is correct for v1's one instance; §23 documents the Redis storage swap
 * for when there are two. Individual routes tighten or loosen it with
 * `@Throttle({ default: { limit, ttl } })` — see `throttle-profiles.ts` for the
 * named tiers.
 *
 * Registered in `AppModule` as an `APP_GUARD` so `ThrottlerGuard` and `CsrfGuard`
 * are resolved by DI and belong to the module graph, rather than to a bootstrap
 * function a verification script could forget to call. Order is provider order:
 * throttle first (the cheapest way to shed load, and it means a flood of requests
 * is rejected before doing any work), then the CSRF header check.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CsrfGuard } from '../guards/csrf.guard';
import { THROTTLE_LIMITS } from './throttle-profiles';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ...THROTTLE_LIMITS.default },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [ThrottlerModule],
})
export class ThrottlingModule {}
