import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('worlds')
export class WorldsController {
  constructor(private readonly worlds: WorldsService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.worlds.findBySlug(slug);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  async create(@Body() body: { slug: string; name: string; locale?: string; direction?: string; themeTokens?: any; capabilities?: any }) {
    return this.worlds.create(body);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any) {
    return this.worlds.patch(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.worlds.remove(id);
  }
}
