import {
  ErrorCode,
  BadRequestDomainException,
  ConflictDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

export class OrderNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.ORDER_NOT_FOUND, id ? `Order not found: ${id}` : 'Order not found');
  }
}

export class EmptyCartException extends BadRequestDomainException {
  constructor() {
    super(ErrorCode.EMPTY_CART, 'Cart is empty');
  }
}

/** Order is in the wrong state for this action (cancelling a paid order, …). */
export class OrderStateException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message);
  }
}

/**
 * A cart holding lines priced in different currencies. Summing them would produce
 * a confidently wrong total, so checkout refuses instead — the fix is upstream
 * (one currency per world), never a silent conversion at the order boundary.
 */
export class MixedCurrencyCartException extends BadRequestDomainException {
  constructor(currencies: string[]) {
    super(
      ErrorCode.VALIDATION_FAILED,
      `Cart mixes currencies (${currencies.join(', ')}); an order must be priced in one currency.`,
    );
  }
}

/**
 * `POST /orders` requires an `Idempotency-Key` (§20). Missing or malformed gets
 * its own code rather than a generic VALIDATION_FAILED, because the fix is
 * different: the client has to *add a header*, not reshape a body.
 */
export class IdempotencyKeyRequiredException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_IDEMPOTENCY_KEY, message);
  }
}

/**
 * The key exists but cannot be replayed right now: another identical request is
 * still running, or the key was already used by a different user (whose order
 * this caller is not entitled to see). 409, not 400 — retrying the same key later
 * is the correct client behaviour.
 */
export class IdempotencyKeyConflictException extends ConflictDomainException {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message);
  }
}
