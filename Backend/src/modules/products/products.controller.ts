import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Permissions } from '../../common/decorators';
import { FirebaseSessionGuard, PermissionsGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodListResponse, ApiZodOkResponse } from '../../docs/decorators';
import { productSchema } from '../../docs/response-schemas';
import { CreateProductSchema, ProductsService, UpdateProductSchema } from './products.service';

/**
 * Catalog for one World (backend-architecture.md §5).
 *
 * Reads are public because the storefront is public; writes require
 * `products.create|update|delete`, which no SHIPPING or USER role holds. Every
 * route is scoped by `:worldId` and the service re-checks that variants,
 * categories and products belong to that World — there is no cross-World path.
 */
@ApiTags('worlds/:worldId/products')
@ApiCookieAuth('cookieAuth')
@Controller('worlds/:worldId/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Throttle({ default: THROTTLE_LIMITS.public })
  @ApiOperation({
    security: [],
    summary: 'List products in a World',
    description: 'Public storefront read. Defaults to ACTIVE products only.',
  })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter to one category' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'DRAFT | ACTIVE | ARCHIVED (default ACTIVE)' })
  @ApiZodListResponse(productSchema, 'Products with their variants')
  @Get()
  async list(
    @Param('worldId') worldId: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.products.list(worldId, categoryId, status);
  }

  @Throttle({ default: THROTTLE_LIMITS.public })
  @ApiOperation({ summary: 'One product by slug, with its variants', security: [] })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'slug', schema: { type: 'string' } })
  @ApiZodOkResponse(productSchema, 'The product')
  @Get(':slug')
  async getBySlug(@Param('worldId') worldId: string, @Param('slug') slug: string) {
    return this.products.getBySlug(worldId, slug);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Create a product with its variants', description: '`worldId` comes from the URL; a body-supplied one is rejected.' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(CreateProductSchema)
  @ApiZodOkResponse(productSchema, 'The created product')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.create')
  @Post()
  async create(
    @Param('worldId') worldId: string,
    @Body(new ZodValidationPipe(CreateProductSchema))
    body: z.infer<typeof CreateProductSchema>,
  ) {
    return this.products.create(worldId, {
      ...body,
      worldId,
    });
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateProductSchema)
  @ApiZodOkResponse(productSchema, 'The updated product')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.update')
  @Patch(':id')
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema))
    body: z.infer<typeof UpdateProductSchema>,
  ) {
    return this.products.update(worldId, id, body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(productSchema, 'The deleted product, with its variants')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.delete')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.products.remove(worldId, id);
  }
}
