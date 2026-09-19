/**
 * Typed fetch wrapper — frontend-architecture.md §16.
 *
 * Phase 1 establishes the *shape*: a generic `apiFetch<T>()` that sends the
 * session cookie (credentials: "include"), parses JSON, and normalizes failures
 * into an `ApiError`. No real endpoints exist yet — endpoint functions are added
 * in Phase 3, each with its own Zod response schema, all routed through this one
 * wrapper. It is a network stub by design: the backend may not be running yet.
 */

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000/api";

export interface ApiErrorBody {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseErrorResponse(
  response: Response,
): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // non-JSON body — fall through to status text
  }
  return new ApiError(
    response.status,
    body.message ?? response.statusText,
    body.code,
  );
}

/**
 * Thin typed fetch: always includes credentials so the HttpOnly session cookie
 * is attached, forwards JSON, and never throws raw `fetch`/network errors —
 * everything comes back as an `ApiError`. Endpoint modules in `lib/api/*`
 * declare `apiFetch<MyValidatedType>(path)` and run the result through Zod
 * at their own layer (§16).
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}