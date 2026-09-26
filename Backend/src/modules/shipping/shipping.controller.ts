import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
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

@Controller('shipments')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Shipment list for the shipping dashboard. `shipping.read` is held by
   * SHIPPING, ADMIN and SUPER_ADMIN only — a plain USER gets a 403 here, and
   * the response carries no customer or product PII (see ShippingService).
   */
  @UseGuards(FirebaseSessionGuard, PermissionsGuard)
  @Permissions('shipping.read')
  @Get()
  listShipments() {
    return this.shippingService.listShipments();
  }

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
