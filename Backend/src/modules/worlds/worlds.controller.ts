import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { WorldsService } from './worlds.service';
import { Roles } from '../../common/decorators';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { RolesGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodCreatedResponse, ApiZodListResponse, ApiZodOkResponse } from '../../docs/decorators';
import { worldBySlugSchema, worldListItemSchema } from '../../docs/response-schemas';

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

@ApiTags('worlds')
@ApiCookieAuth('cookieAuth')
@Controller('worlds')
export class WorldsController {
  constructor(private readonly worlds: WorldsService) {}

  @Throttle({ default: THROTTLE_LIMITS.public })
  @ApiOperation({
    security: [],
    summary: 'Public World composition by slug',
    description:
      'What the storefront renders: identity + ordered sections. No authentication — a visitor has to be ' +
      'able to load a World page. This is also the one public route that returns section configs.',
  })
  @ApiParam({ name: 'slug', schema: { type: 'string', example: 'anime' } })
  @ApiZodOkResponse(worldBySlugSchema, 'The World with its ordered sections')
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.worlds.findBySlug(slug);
  }

  /**
   * Super-Admin World list (F9's `/super-admin/worlds`). Same role gate as
   * create/patch/delete below — World *identity* is Super-Admin-only
   * (backend-architecture.md §6/§26); composing sections is Admin's.
   */
  @ApiOperation({
    summary: 'Super-Admin World list',
    description: 'Identity plus a `sectionCount` per row — never the section configs, which is Admin\'s concern.',
  })
  @ApiZodListResponse(worldListItemSchema, 'Worlds with section counts')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  async list() {
    return this.worlds.list();
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: 'Create a World (identity only)',
    description: 'No `sections` in the payload: a new World starts with zero sections and becomes reachable at /<slug> immediately.',
  })
  @ApiZodBody(CreateWorldSchema)
  @ApiZodCreatedResponse(worldListItemSchema, 'The created World')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateWorldSchema))
    body: z.infer<typeof CreateWorldSchema>,
  ) {
    return this.worlds.create(body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: "Update a World's identity or status", description: 'Audited as `world.updated`.' })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateWorldSchema)
  @ApiZodOkResponse(worldListItemSchema, 'The updated World')
  @ApiErrorResponses({ auth: true })
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

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: 'Delete a World',
    description: 'Audited as `world.deleted`; cascades to its sections. Returns the deleted World so the caller can confirm which one went.',
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(worldListItemSchema, 'The deleted World')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.worlds.remove(id);
  }
}
