/**
 * OpenAPI decorators over Zod schemas — backend-architecture.md §22.
 *
 * `ApiProperty` decoration is out (the DTOs are Zod objects, not classes, per
 * §11); these thin wrappers hand the schema's JSON Schema to `@nestjs/swagger` at
 * the route, so a handler reads:
 *
 *     @ApiZodBody(CreateProductSchema)
 *     @ApiZodOkResponse(productListSchema, 'Products in the world')
 *     create(@Body(new ZodValidationPipe(CreateProductSchema)) body: CreateProductDto) {}
 *
 * `API_ERROR_SCHEMA` is attached to every documented failure by `ApiErrorResponses`,
 * so `/api/docs` shows the §13 error contract on every route instead of only on
 * the ones someone remembered to annotate.
 */
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  type ApiResponseOptions,
  type SchemaObject,
} from '@nestjs/swagger';
import { z, type ZodType } from 'zod';
import { ErrorCode } from '../common/errors/domain.exception';
import { paginated, zodToOpenApiSchema } from './openapi-adapter';

export const API_ERROR_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['statusCode', 'code', 'message'],
  properties: {
    statusCode: { type: 'number', example: 400 },
    code: {
      type: 'string',
      description: 'Stable machine-readable identifier. Branch on this, not on the message.',
      example: ErrorCode.VALIDATION_FAILED,
    },
    message: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      example: 'slug: slug must match /^[a-z0-9-]+$/',
    },
  },
};

/** Request body, generated from the exact schema the pipe validates with. */
export function ApiZodBody(schema: ZodType, description?: string) {
  return ApiBody({ schema: zodToOpenApiSchema(schema), required: true, description });
}

export function ApiZodOkResponse(schema: ZodType, description?: string) {
  return ApiOkResponse({ schema: zodToOpenApiSchema(schema), description });
}

export function ApiZodCreatedResponse(schema: ZodType, description?: string) {
  return ApiCreatedResponse({ schema: zodToOpenApiSchema(schema), description });
}

export function ApiZodNoContent(description?: string) {
  return ApiNoContentResponse({ description });
}

/** Shorthand for a paginated list response. */
export function ApiZodPaginatedResponse(schema: ZodType, description?: string) {
  return ApiZodOkResponse(paginated(schema), description);
}

/** Shorthand for a bare-array list response. */
export function ApiZodListResponse(schema: ZodType, description?: string) {
  return ApiZodOkResponse(z.array(schema), description);
}

/**
 * The failures worth documenting on a route. `400` is nearly always
 * VALIDATION_FAILED from the Zod pipe, `401` UNAUTHENTICATED when the route
 * needs a session, `403` FORBIDDEN when it needs a permission or role.
 */
export function ApiErrorResponses(options: { validation?: boolean; auth?: boolean } = {}) {
  const decorators: MethodDecorator[] = [];

  if (options.validation !== false) {
    decorators.push(
      ApiResponse({
        status: 400,
        description: 'VALIDATION_FAILED — the body did not match the documented schema.',
        schema: API_ERROR_SCHEMA,
      }),
    );
  }
  if (options.auth) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'UNAUTHENTICATED / SESSION_INVALID — no valid session cookie.',
        schema: API_ERROR_SCHEMA,
      }),
    );
    // Every route that documents a session also runs a permission/role guard
    // behind it, so 403 is a real outcome and not a hypothetical one.
    decorators.push(
      ApiResponse({
        status: 403,
        description: 'FORBIDDEN / CSRF_HEADER_MISSING — missing permission or role, or a mutating request without `X-Requested-With`.',
        schema: API_ERROR_SCHEMA,
      }),
    );
  }

  return (...target: unknown[]) => {
    for (const decorator of decorators) {
      (decorator as (...args: unknown[]) => void)(...target);
    }
  };
}

export type { ApiResponseOptions };
