import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { WorldsService } from './worlds.service';
import { Roles } from '../../common/decorators';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { RolesGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * `CreateWorldSchema` — World *identity* only (backend-architecture.md §26:
 * "POST /super-admin/worlds with slug/name/theme/direction"). `world_sections`
 * is deliberately absent from this payload: composing a World is Admin's job
 * through the section manager, so a World created here starts with zero
 * sections and stays un-composed until an Admin builds it out.
 */
const CreateWorldSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, 'Slug is required')
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  locale: z.string().trim().min(2).max(16).optional(),
  direction: z.enum(['ltr', 'rtl', 'LTR', 'RTL']).optional(),
  themeTokens: z
    .object({
      colors: z.record(z.string(), z.string()).optional(),
      radius: z.string().optional(),
    })
    .passthrough()
    .optional(),
  capabilities: z.record(z.string(), z.boolean()).optional(),
});

const UpdateWorldSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    direction: z.enum(['ltr', 'rtl', 'LTR', 'RTL']).optional(),
    themeTokens: z
      .object({
        colors: z.record(z.string(), z.string()).optional(),
        radius: z.string().optional(),
      })
      .passthrough()
      .optional(),
    capabilities: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

@Controller('worlds')
export class WorldsController {
  constructor(private readonly worlds: WorldsService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.worlds.findBySlug(slug);
  }

  /**
   * Super-Admin World list (F9's `/super-admin/worlds`). Same role gate as
   * create/patch/delete below — World *identity* is Super-Admin-only
   * (backend-architecture.md §6/§26); composing sections is Admin's.
   */
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  async list() {
    return this.worlds.list();
  }

  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateWorldSchema))
    body: z.infer<typeof CreateWorldSchema>,
  ) {
    return this.worlds.create(body);
  }

  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWorldSchema)) body: z.infer<typeof UpdateWorldSchema>,
  ) {
    return this.worlds.patch(id, {
      ...body,
      // the enum column stores uppercase; normalize the UI's lowercase input
      status: body.status ? body.status.toUpperCase() : undefined,
    });
  }

  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.worlds.remove(id);
  }
}
