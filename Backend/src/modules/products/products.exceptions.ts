/**
 * Products domain exceptions — backend-architecture.md §13.
 *
 * Declared inside the module that throws them and imported by nobody outside
 * it, so the module boundary in §3 holds: other modules never reach into
 * Products to learn what a Products failure looks like. The global filter reads
 * only the `code` off the base class.
 */
import { ErrorCode, BadRequestDomainException, NotFoundDomainException } from '../../common/errors/domain.exception';

export class ProductNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.PRODUCT_NOT_FOUND, id ? `Product not found: ${id}` : 'Product not found');
  }
}

export class ProductVariantNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(
      ErrorCode.VARIANT_NOT_FOUND,
      id ? `Product variant not found: ${id}` : 'Product variant not found',
    );
  }
}

export class ProductCategoryNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.CATEGORY_NOT_FOUND, id ? `Category not found: ${id}` : 'Category not found');
  }
}

/** A variant/category belonging to another World — never a 404, the ids are real. */
export class WorldMismatchException extends BadRequestDomainException {
  constructor() {
    super(ErrorCode.WORLD_MISMATCH, 'World mismatch');
  }
}
