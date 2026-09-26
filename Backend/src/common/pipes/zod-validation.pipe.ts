import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodTypeAny } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodTypeAny) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    if (!this.schema) {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      // A raw ZodError escaping the pipe would surface as a 500, telling the
      // client the server broke when actually the *request* was malformed.
      // Normalize it to a 400 with a flat, client-readable message list.
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`),
        });
      }
      throw error;
    }
  }
}
