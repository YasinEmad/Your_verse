import { ErrorCode, NotFoundDomainException, ConflictDomainException } from '../../common/errors/domain.exception';

export class WorldNotFoundException extends NotFoundDomainException {
  constructor(idOrSlug?: string) {
    super(ErrorCode.WORLD_NOT_FOUND, idOrSlug ? `World not found: ${idOrSlug}` : 'World not found');
  }
}

export class DuplicateWorldSlugException extends ConflictDomainException {
  constructor(slug: string) {
    super(ErrorCode.DUPLICATE_SLUG, `A World with the slug "${slug}" already exists`);
  }
}

/**
 * A World with a catalog cannot be deleted. Section *composition* is not a
 * blocker — it has no meaning without its World and is removed with it — but
 * products and categories do, and silently cascading into them (or into the
 * orders that reference them) from a single DELETE is not a decision a route
 * should make on the caller's behalf.
 */
export class WorldNotEmptyException extends ConflictDomainException {
  constructor(products: number, categories: number) {
    super(
      ErrorCode.CONFLICT,
      `World still has ${products} product(s) and ${categories} categor(ies). ` +
        'Remove or move them before deleting the World.',
    );
  }
}
