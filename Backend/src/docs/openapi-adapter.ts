/**
 * Zod → OpenAPI adapter — backend-architecture.md §22, §11.
 *
 * The DTOs here are Zod schemas, not classes (class-validator is deliberately not
 * used), so `@nestjs/swagger` cannot reflect them and `nestjs-zod` is not needed
 * either: Zod 4 ships `z.toJSONSchema()`, which is the whole job. Every
 * request body in the generated document is produced from the *same schema
 * object* the `ZodValidationPipe` validates with, so the docs cannot drift from
 * the contract — they are the contract, serialized.
 *
 * The alternative considered and rejected: hand-written `@ApiProperty()` DTO
 * classes. That doubles every payload definition and adds a third thing to keep
 * in sync (Zod schema, DTO class, actual response), which is how API docs start
 * lying.
 *
 * Two deliberate choices in the conversion:
 *  - `io: 'input'` — the document describes what a client must *send*. A field
 *    with a Zod `.default()` is optional on the wire; documenting it as required
 *    would make the spec stricter than the server.
 *  - `unrepresentable: 'any'` — an exotic type (e.g. `z.date()` in one schema)
 *    becomes `{}` instead of throwing and taking the document down. A slightly
 *    vague field beats a missing API.
 */
import type { ZodType } from 'zod';
import { z } from 'zod';

export type JsonSchema = Record<string, unknown>;

export function zodToOpenApiSchema(schema: ZodType): JsonSchema {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  }) as JsonSchema;
}

/** `{ items: [...], total, page, pageSize, totalPages }` — the list shape. */
export function paginated<T extends ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}

/** A response that is just a list of `item`. */
export function listOf<T extends ZodType>(item: T) {
  return z.array(item);
}
