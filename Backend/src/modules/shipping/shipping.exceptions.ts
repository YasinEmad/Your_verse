import {
  ErrorCode,
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

export class ShipmentNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.SHIPMENT_NOT_FOUND, id ? `Shipment not found: ${id}` : 'Shipment not found');
  }
}

/** Every illegal move in the shipment state machine: skips, reversals, cancelling a delivered parcel. */
export class ShipmentTransitionException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message);
  }
}

/**
 * `createForOrder` looks the order up itself, so it needs its own "no such
 * order" failure — module-local, but carrying the *same* `ORDER_NOT_FOUND` code
 * the Orders module uses, so the wire contract is identical without Shipping
 * importing anything from Orders (§3).
 */
export class OrderNotShippableException extends NotFoundDomainException {
  constructor() {
    super(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
  }
}
