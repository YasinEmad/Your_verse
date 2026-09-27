import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { corsOriginAllowlist } from './common/http/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const allowed = corsOriginAllowlist();
  if (!allowed.length) {
    // Fails visibly: with an empty allowlist every cross-origin call is blocked.
    // Better a broken dev environment than an open production one. Goes through
    // the Nest logger rather than `console`, so it lands as one JSON line like
    // every other line in the log.
    new Logger('Config').warn(
      'FRONTEND_URL / FRONTEND_URLS is not set — cross-origin requests will be blocked.',
    );
  }

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
