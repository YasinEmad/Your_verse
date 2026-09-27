import { ErrorCode, BadRequestDomainException, NotFoundDomainException } from '../../../common/errors/domain.exception';

export class SectionNotFoundException extends NotFoundDomainException {
  constructor(id?: string) {
    super(ErrorCode.SECTION_NOT_FOUND, id ? `Section not found: ${id}` : 'Section not found');
  }
}

/** A section whose `config` matches no known section schema — rejected before it is persisted. */
export class InvalidSectionConfigException extends BadRequestDomainException {
  constructor(message: string) {
    super(ErrorCode.INVALID_SECTION_CONFIG, message);
  }
}
