import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { THROTTLE_LIMITS } from '../../common/throttling/throttle-profiles';
import { ApiErrorResponses, ApiZodBody, ApiZodListResponse, ApiZodOkResponse } from '../../docs/decorators';
import { shipmentLabelSchema } from '../../docs/response-schemas';
import { ShippingService } from './shipping.service';

const ShipmentStatusSchema = z.enum([
  'ORDERED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

/**
 * Every field optional, but at least one must be present — otherwise the
 * dashboard could fire a no-op PATCH and get a pointless audit row. `status` is
 * validated for shape here and for *legality* (legal transitions only) in
 * ShippingService, which owns the state machine.
 */
const UpdateShipmentSchema = z
  .object({
    trackingNumber: z.string().trim().max(120, 'Tracking number is too long').optional(),
    carrier: z.string().trim().max(120, 'Carrier name is too long').optional(),
    status: ShipmentStatusSchema.optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Provide at least one of trackingNumber, carrier or status',
  });

@ApiTags('shipments')
@ApiCookieAuth('cookieAuth')
@Controller('shipments')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Shipment list for the shipping dashboard. `shipping.read` is held by
   * SHIPPING, ADMIN and SUPER_ADMIN only — a plain USER gets a 403 here, and
   * the response carries no customer or product PII (see ShippingService).
   */
  @ApiOperation({
    summary: 'Shipments with their label context',
    description:
      'The shipping desk payload: shipment fields plus order id, order status, item count and the ' +
      'destination captured on the order. Deliberately no customer record (no email/role/user id), no ' +
      'product row and no money — a shipping clerk needs a label, not a customer.',
  })
  @ApiZodListResponse(shipmentLabelSchema, 'Shipments, most recently updated first')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('shipping.read')
  @Get()
  listShipments() {
    return this.shippingService.listShipments();
  }

  @Throttle({ default: THROTTLE_LIMITS.writes })
  @ApiOperation({
    summary: 'Update carrier, tracking number and/or status',
    description:
      'Status moves are one step at a time along ORDERED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → ' +
      'DELIVERED, plus CANCELLED from any non-delivered shipment; anything else is 400 ' +
      'INVALID_STATE_TRANSITION. An empty string clears carrier/tracking. Audited as `shipment.updated`, ' +
      'attributed to the acting user.',
  })
  @ApiParam({ name: 'id', schema: { type: 'string', format: 'uuid' } })
  @ApiZodBody(UpdateShipmentSchema)
  @ApiZodOkResponse(shipmentLabelSchema, 'The updated shipment, same shape as the list row')
  @ApiErrorResponses({ auth: true })
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('shipping.update')
  @Patch(':id')
  updateShipment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateShipmentSchema))
    body: z.infer<typeof UpdateShipmentSchema>,
  ) {
    return this.shippingService.updateShipmentStatus(id, body, actor);
  }
}
