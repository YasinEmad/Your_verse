import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
export declare class ZodValidationPipe implements PipeTransform {
    private readonly schema?;
    constructor(schema?: ZodTypeAny | undefined);
    transform(value: unknown, _metadata: ArgumentMetadata): unknown;
}
