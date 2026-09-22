import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

@Controller('worlds/:worldId/sections')
export class SectionsController {
  constructor(private readonly svc: SectionsService) {}

  @Get()
  async list(@Param('worldId') worldId: string) {
    return this.svc.listForWorld(worldId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Post()
  async create(@Param('worldId') worldId: string, @Body() body: { type: string; config: any; position?: number; enabled?: boolean }) {
    return this.svc.create(worldId, body);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Patch('reorder')
  async reorder(@Param('worldId') worldId: string, @Body() positions: Array<{ id: string; position: number }>) {
    return this.svc.reorder(worldId, positions);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Patch(':id')
  async update(@Param('worldId') worldId: string, @Param('id') id: string, @Body() body: Partial<{ config: any; enabled: boolean }>) {
    return this.svc.update(worldId, id, body);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.svc.remove(worldId, id);
  }
}
