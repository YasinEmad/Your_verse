import { ErrorCode, UnauthorizedDomainException } from '../../common/errors/domain.exception';

export class InvalidIdTokenException extends UnauthorizedDomainException {
  constructor() {
    super(ErrorCode.UNAUTHENTICATED, 'Invalid Firebase ID token');
  }
}

/** Session cookie missing, expired, or revoked server-side. */
export class InvalidSessionException extends UnauthorizedDomainException {
  constructor(message = 'Invalid or revoked session cookie') {
    super(ErrorCode.SESSION_INVALID, message);
  }
}

export class UserNotProvisionedException extends UnauthorizedDomainException {
  constructor() {
    super(ErrorCode.UNAUTHENTICATED, 'User not provisioned');
  }
}
