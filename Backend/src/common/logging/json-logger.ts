/**
 * Structured JSON logger — backend-architecture.md §18.
 *
 * One JSON object per line, every line, in every environment: a log line that
 * changes shape between dev and prod is a log line nobody can query. Installed
 * with `app.useLogger(new JsonLogger())`, which makes it the sink for Nest's
 * own boot messages *and* for every `new Logger(...)` in the codebase, so there
 * is exactly one format to parse.
 *
 * Shape: `{ "time", "level", "context", "msg", ...fields }`. `context` is the
 * logger name (`HttpException`, `RequestLogging`, `NestFactory`, …) so a
 * deployment log can be sliced by subsystem.
 *
 * What is deliberately *not* here: a redaction pass over arbitrary objects. The
 * fields logged are chosen at the call site (§ phase rules: never log secrets),
 * and a blanket deep-redactor that guesses at key names tends to mangle payloads
 * while still missing the one key that mattered. Request logging, which touches
 * the most user data, logs identifiers and paths only — never headers, never
 * cookies, never bodies.
 */
import { Injectable, type LoggerService } from '@nestjs/common';

type Level = 'error' | 'warn' | 'log' | 'debug' | 'verbose' | 'fatal';

const LEVEL_ORDER: Record<Level, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

function configuredLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? '').toLowerCase();
  return raw in LEVEL_ORDER ? (raw as Level) : 'log';
}

@Injectable()
export class JsonLogger implements LoggerService {
  private readonly threshold = LEVEL_ORDER[configuredLevel()];

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, stackOrContext?: string, context?: string): void {
    this.write('error', message, context ?? stackOrContext, stackOrContext);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }

  private write(level: Level, message: unknown, context?: string, extra?: unknown): void {
    if (LEVEL_ORDER[level] > this.threshold) return;

    // Nest calls log('...') for some internals and log({...}) for ours; both must
    // come out as one JSON object, never `[object Object]`.
    const base: Record<string, unknown> =
      typeof message === 'string' ? { msg: message } : { ...(message as Record<string, unknown>) };

    const line: Record<string, unknown> = {
      time: new Date().toISOString(),
      level,
      ...base,
    };

    if (context) line.context = context;
    if (extra && typeof extra === 'string' && !line.stack) line.stack = extra;
    // A structured call site supplies its own `msg` or `event`; only fill one in
    // for the string form, so object logs don't all carry a useless "log" field.
    if (!('msg' in line) && !('event' in line) && typeof message !== 'string') {
      line.msg = level;
    }

    process.stdout.write(`${this.stringify(line)}\n`);
  }

  private stringify(value: Record<string, unknown>): string {
    try {
      return JSON.stringify(value, (_key, entry: unknown) =>
        entry instanceof Error ? { name: entry.name, message: entry.message, stack: entry.stack } : entry,
      );
    } catch {
      // A circular payload must never take the process down.
      return JSON.stringify({ time: new Date().toISOString(), level: 'error', msg: 'log serialization failed' });
    }
  }
}
