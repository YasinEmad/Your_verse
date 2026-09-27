/**
 * Global error normalizer — backend-architecture.md §13.
 *
 * Every error leaving this API has the same three fields:
 *
 *     { "statusCode": 404, "code": "PRODUCT_NOT_FOUND", "message": "Product not found" }
 *
 * `message` is a string, or an array of strings for field-level validation
 * problems (`ZodValidationPipe` produces one per issue; the frontend's
 * `ApiError` handles both forms).
 *
 * Three responsibilities, in order:
 *  1. Take the `code` from a `DomainException`, or derive a stable one from the
 *     HTTP status when something was thrown without one (a bare Nest exception
 *     from a guard, a library, or a future module that forgot).
 *  2. Never leak internals. A 5xx's real message and stack go to the log, keyed
 *     by request id; the client gets a generic message. This is the difference
 *     between "your card was declined" and a Prisma query string.
 *  3. Log the failure once, structurally, with the request id the
 *     `RequestLoggingInterceptor` assigned, so an error in the logs and the
 *     `X-Request-Id` header the caller was given point at the same thing.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  DEFAULT_CODE_BY_STATUS,
  ErrorCode,
  type ErrorCodeValue,
} from '../errors/domain.exception';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message } = this.normalize(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          requestId: request.requestId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          status,
          code,
          message,
          // The real cause stays in the log, never in the response.
          cause: exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'unhandled request failure',
      );
    }

    response.status(status).json({ statusCode: status, code, message });
  }

  private normalize(
    exception: unknown,
    status: number,
  ): { code: ErrorCodeValue; message: string | string[] } {
    // 1. An exception that already carries the contract (DomainException, and the
    //    Zod pipe's VALIDATION_FAILED) passes through untouched.
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const body = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
      const code: ErrorCodeValue =
        (typeof body.code === 'string' ? (body.code as ErrorCodeValue) : undefined) ??
        DEFAULT_CODE_BY_STATUS[status] ??
        (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.VALIDATION_FAILED);
      const message = this.messageOf(body.message, exception.message);
      return { code, message };
    }

    // 2. Anything not an HttpException is a bug. Never echo it.
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  private messageOf(
    message: unknown,
    fallback: string,
  ): string | string[] {
    if (typeof message === 'string' && message.length) return message;
    if (Array.isArray(message) && message.every((entry) => typeof entry === 'string')) {
      return message as string[];
    }
    // Nest's own "Bad Request Exception" phrasing is noise; use the status text.
    return fallback.replace(/ ?Exception$/, '') || 'Request failed';
  }
}
