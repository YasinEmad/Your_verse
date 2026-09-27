/**
 * Domain exceptions — backend-architecture.md §13.
 *
 * The error contract this whole API speaks:
 *
 *     { "statusCode": 404, "code": "PRODUCT_NOT_FOUND", "message": "Product not found" }
 *
 * `code` is the part clients are allowed to branch on, so it must be a *stable
 * identifier*, never a copy of the human message: messages get reworded, codes
 * may not. Every failure that a client could reasonably handle gets a named
 * exception carrying a constant from `ErrorCode`; anything left over is
 * normalized by `HttpExceptionFilter` into a generic code derived from the HTTP
 * status, so no response can escape the shape.
 */
import { HttpException, HttpStatus } from '@nestjs/common';

/** Every stable code the API can emit, in one place, so nothing is invented ad hoc. */
export const ErrorCode = {
  // 400
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  EMPTY_CART: 'EMPTY_CART',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_SECTION_CONFIG: 'INVALID_SECTION_CONFIG',
  DUPLICATE_SLUG: 'DUPLICATE_SLUG',
  DUPLICATE_SKU: 'DUPLICATE_SKU',
  WORLD_MISMATCH: 'WORLD_MISMATCH',
  PARENT_CATEGORY_INVALID: 'PARENT_CATEGORY_INVALID',
  // 401 / 403
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  SESSION_INVALID: 'SESSION_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_HEADER_MISSING: 'CSRF_HEADER_MISSING',
  SELF_ROLE_CHANGE_FORBIDDEN: 'SELF_ROLE_CHANGE_FORBIDDEN',
  // 404
  NOT_FOUND: 'NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_ITEM_NOT_FOUND: 'CART_ITEM_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  SHIPMENT_NOT_FOUND: 'SHIPMENT_NOT_FOUND',
  WORLD_NOT_FOUND: 'WORLD_NOT_FOUND',
  SECTION_NOT_FOUND: 'SECTION_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // 409
  CONFLICT: 'CONFLICT',
  // 429
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Fallback code per HTTP status, for exceptions thrown without one. */
export const DEFAULT_CODE_BY_STATUS: Record<number, ErrorCodeValue> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
};

/**
 * Base class for every domain failure. `message` may be a string or a list of
 * strings — `ZodValidationPipe` and the frontend's `ApiError` both handle the
 * array form, which is how field-level problems stay readable.
 */
export class DomainException extends HttpException {
  constructor(
    readonly code: ErrorCodeValue,
    message: string | string[],
    status: HttpStatus,
  ) {
    super({ code, message, statusCode: status }, status);
  }
}

export class BadRequestDomainException extends DomainException {
  constructor(code: ErrorCodeValue, message: string | string[]) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

export class NotFoundDomainException extends DomainException {
  constructor(code: ErrorCodeValue, message: string | string[]) {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenDomainException extends DomainException {
  constructor(code: ErrorCodeValue, message: string | string[]) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedDomainException extends DomainException {
  constructor(code: ErrorCodeValue, message: string | string[]) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ConflictDomainException extends DomainException {
  constructor(code: ErrorCodeValue, message: string | string[]) {
    super(code, message, HttpStatus.CONFLICT);
  }
}
