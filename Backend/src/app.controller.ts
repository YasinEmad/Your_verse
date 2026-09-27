import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiZodOkResponse } from './docs/decorators';
import { healthSchema } from './docs/response-schemas';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Liveness probe', security: [] })
  @ApiZodOkResponse(healthSchema, 'The service is up')
  @Get('health')
  health(): { status: string } {
    return this.appService.getHealth();
  }
}
