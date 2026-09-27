import {
  ErrorCode,
  ForbiddenDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

export class UserNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.USER_NOT_FOUND, id ? `User not found: ${id}` : 'User not found');
  }
}

/**
 * Distinct from a plain permission failure: this is a Super Admin removing their
 * own authority, which would lock the last Super Admin out of the system.
 */
export class SelfRoleChangeException extends ForbiddenDomainException {
  constructor() {
    super(ErrorCode.SELF_ROLE_CHANGE_FORBIDDEN, 'You cannot change your own role');
  }
}
