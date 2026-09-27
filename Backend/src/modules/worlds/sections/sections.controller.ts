import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { SectionsService } from './sections.service';
import { KNOWN_SECTION_TYPES } from './section-types';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FirebaseSessionGuard } from '../../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodCreatedResponse, ApiZodListResponse, ApiZodOkResponse } from '../../../docs/decorators';
import { worldSectionSchema } from '../../../docs/response-schemas';

/**
 * Section composition for a World (backend-architecture.md §26).
 *
 * Reads are public because the storefront composes a page from them; writes are
 * `worlds.sections.update`, i.e. ADMIN, not SUPER_ADMIN — composition is Admin's
 * job, World *identity* is Super Admin's.
 *
 * `config` is validated loosely here (must be a JSON object) and authoritatively
 * by the frontend's `renderSection` at render time (§17): the backend's job is to
 * refuse obviously malformed data, not to own UI rendering rules.
 */
const SectionTypeSchema = z.enum(KNOWN_SECTION_TYPES);

const CreateSectionSchema = z
  .object({
    type: SectionTypeSchema,
    config: z.record(z.string(), z.unknown()).default({}),
    position: z.number().int().min(0).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

/** A bare array of `{ id, position }` — the shape the admin section editor sends. */
const ReorderSectionsSchema = z
  .array(z.object({ id: z.string().min(1), position: z.number().int().min(0) }))
  .min(1)
  .max(500);

const UpdateSectionSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

@ApiTags('worlds/:worldId/sections')
@ApiCookieAuth('cookieAuth')
@Controller('worlds/:worldId/sections')
export class SectionsController {
  constructor(private readonly svc: SectionsService) {}

  @ApiOperation({
    security: [],
    summary: 'Ordered section composition for a World',
    description: 'Public: the storefront renders these. `renderSection` in the frontend validates each config authoritatively.',
  })
  @ApiZodListResponse(worldSectionSchema, 'Sections in render order')
  @Get()
  async list(@Param('worldId') worldId: string) {
    return this.svc.listForWorld(worldId);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Add a section to a World' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(CreateSectionSchema)
  @ApiZodCreatedResponse(worldSectionSchema, 'The created section')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Post()
  async create(
    @Param('worldId') worldId: string,
    @Body(new ZodValidationPipe(CreateSectionSchema))
    body: z.infer<typeof CreateSectionSchema>,
  ) {
    return this.svc.create(worldId, body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: 'Reorder sections',
    description: 'All positions are applied in one transaction, so a partial reorder cannot persist.',
  })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(ReorderSectionsSchema, 'A bare array of { id, position }')
  @ApiZodOkResponse(worldSectionSchema, 'The updated sections, in the new order')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Patch('reorder')
  async reorder(
    @Param('worldId') worldId: string,
    @Body(new ZodValidationPipe(ReorderSectionsSchema))
    positions: z.infer<typeof ReorderSectionsSchema>,
  ) {
    return this.svc.reorder(worldId, positions);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: "Update a section's config or enabled flag" })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateSectionSchema)
  @ApiZodOkResponse(worldSectionSchema, 'The updated section')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Patch(':id')
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSectionSchema)) body: z.infer<typeof UpdateSectionSchema>,
  ) {
    return this.svc.update(worldId, id, body);
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({ summary: 'Delete a section' })
  @ApiParam({ name: 'worldId', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodOkResponse(worldSectionSchema, 'The deleted section')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('worlds.sections.update')
  @Delete(':id')
  async remove(@Param('worldId') worldId: string, @Param('id') id: string) {
    return this.svc.remove(worldId, id);
  }
}
