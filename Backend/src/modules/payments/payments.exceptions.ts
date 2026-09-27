import {
  ErrorCode,
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

export class PaymentNotFoundException extends NotFoundDomainException {
  constructor(orderId?: string) {
    super(
      ErrorCode.PAYMENT_NOT_FOUND,
      orderId ? `No payment recorded for order: ${orderId}` : 'Payment not found',
    );
  }
}

/**
 * `confirmOnDelivery` is handed an order id it looks up itself, so it needs its
 * own "no such order" failure — module-local, but carrying the same
 * `ORDER_NOT_FOUND` code Orders uses, so the wire contract is identical without
 * Payments importing anything from Orders (§3, §27).
 */
export class OrderNotPayableException extends NotFoundDomainException {
  constructor() {
    super(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
  }
}

/**
 * The payment exists but cannot move to PAID — the order was cancelled, already
 * refunded, or the payment is in a state this codebase has no transition out of.
 * Carries the same INVALID_STATE_TRANSITION code the Orders and Shipping state
 * machines use, so a client handles all three the same way.
 */
export class PaymentStateException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message);
  }
}
