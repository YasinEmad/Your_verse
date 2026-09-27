import {
  ErrorCode,
  BadRequestDomainException,
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

/** Order is in the wrong state for this action (pay an already-paid order, …). */
export class OrderStateException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message);
  }
}
