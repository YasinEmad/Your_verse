import { NextResponse } from "next/server";

/**
 * BFF auth-session placeholder — frontend-architecture.md §12.
 * Phase 1 reserves the route only; real Firebase exchange lands in Phase 2.
 * Returns a structured 501 so the boot check sees a defined, typed response
 * rather than a raw fetch failure.
 */
export async function POST() {
  return NextResponse.json(
    {
      code: "SESSION_ENDPOINT_NOT_READY",
      message: "Auth session endpoint activates in Phase 2 (Firebase).",
    },
    { status: 501 },
  );
}