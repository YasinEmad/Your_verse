import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FirebaseSessionGuard } from '../../common/guards/firebase-session.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ShippingService } from './shipping.service';

const UpdateShipmentSchema = z.object({
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  status: z
    .enum(['ORDERED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'])
    .optional(),
});

@Controller('shipments')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

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
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateShipmentSchema)) body: z.infer<typeof UpdateShipmentSchema>,
  ) {
    return this.shippingService.updateShipmentStatus(id, body);
  }
}
