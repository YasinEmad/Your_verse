import {
  ErrorCode,
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';

export class CategoryNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.CATEGORY_NOT_FOUND, id ? `Category not found: ${id}` : 'Category not found');
  }
}

/** Also covers "a category cannot be its own parent" — same client mistake. */
export class InvalidParentCategoryException extends BadRequestDomainException {
  constructor(message = 'A category cannot be its own parent') {
    super(ErrorCode.PARENT_CATEGORY_INVALID, message);
  }
}
