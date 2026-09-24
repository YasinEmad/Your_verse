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
import { z } from 'zod';
import { Permissions } from '../../common/decorators';
import { FirebaseSessionGuard, PermissionsGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CategoriesService,
  CreateCategorySchema,
  UpdateCategorySchema,
} from './categories.service';

@Controller('worlds/:worldId/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  async list(@Param('worldId') worldId: string) {
    return this.categories.list(worldId);
  }

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

  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('products.delete')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.categories.remove(worldId, id);
  }
}
