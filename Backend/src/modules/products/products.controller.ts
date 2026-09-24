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
import { z } from 'zod';
import { Permissions } from '../../common/decorators';
import { FirebaseSessionGuard, PermissionsGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateProductSchema, ProductsService, UpdateProductSchema } from './products.service';

@Controller('worlds/:worldId/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  async list(
    @Param('worldId') worldId: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.products.list(worldId, categoryId, status);
  }

  @Get(':slug')
  async getBySlug(@Param('worldId') worldId: string, @Param('slug') slug: string) {
    return this.products.getBySlug(worldId, slug);
  }

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

  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.delete')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.products.remove(worldId, id);
  }
}
