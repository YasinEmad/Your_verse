import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Permissions } from '../../common/decorators';
import { FirebaseSessionGuard, PermissionsGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodListResponse, ApiZodOkResponse } from '../../docs/decorators';
import { categorySchema } from '../../docs/response-schemas';
import {
  CategoriesService,
  CreateCategorySchema,
  UpdateCategorySchema,
} from './categories.service';

@ApiTags('worlds/:worldId/categories')
@ApiCookieAuth('cookieAuth')
@Controller('worlds/:worldId/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Throttle({ default: THROTTLE_LIMITS.public })
  @ApiOperation({ summary: 'List the category tree for a World', description: 'Public storefront read.', security: [] })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiZodListResponse(categorySchema, 'Categories with parent and children')
  @Get()
  async list(@Param('worldId') worldId: string) {
    return this.categories.list(worldId);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Create a category', description: 'A category may be nested under a `parentId` in the same World.' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(CreateCategorySchema)
  @ApiZodOkResponse(categorySchema, 'The created category')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.create')
  @Post()
  async create(
    @Param('worldId') worldId: string,
    @Body(new ZodValidationPipe(CreateCategorySchema))
    body: z.infer<typeof CreateCategorySchema>,
  ) {
    return this.categories.create(worldId, body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Update a category', description: 'Refused with 400 PARENT_CATEGORY_INVALID when a category would become its own parent.' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateCategorySchema)
  @ApiZodOkResponse(categorySchema, 'The updated category')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.update')
  @Patch(':id')
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema))
    body: z.infer<typeof UpdateCategorySchema>,
  ) {
    return this.categories.update(worldId, id, body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(categorySchema, 'The deleted category')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.delete')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.categories.remove(worldId, id);
  }
}
