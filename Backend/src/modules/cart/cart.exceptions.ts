import {
  ErrorCode,
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

/**
 * A missing cart is a 400, not a 404: the request addressed a resource the
 * caller is expected to have (a cart for their own session), so the actionable
 * answer is "there is no cart to modify", not "unknown URL".
 */
export class CartNotFoundException extends BadRequestDomainException {
  constructor() {
    super(ErrorCode.CART_NOT_FOUND, 'Cart not found');
  }
}

export class CartItemNotFoundException extends NotFoundDomainException {
  constructor() {
    super(ErrorCode.CART_ITEM_NOT_FOUND, 'Cart item not found');
  }
}

export class InsufficientInventoryException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INSUFFICIENT_INVENTORY, message);
  }
}
