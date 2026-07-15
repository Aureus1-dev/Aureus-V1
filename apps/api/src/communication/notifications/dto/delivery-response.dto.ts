import { ApiProperty } from '@nestjs/swagger';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import type { NotificationDelivery } from '@prisma/client';

export class DeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: DeliveryChannel }) channel: DeliveryChannel;
  @ApiProperty({ enum: DeliveryStatus }) status: DeliveryStatus;
  @ApiProperty() attempts: number;
  @ApiProperty({ required: false, nullable: true }) lastAttemptAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) deliveredAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) failureReason: string | null;

  static fromEntity(d: NotificationDelivery): DeliveryResponseDto {
    const dto = new DeliveryResponseDto();
    Object.assign(dto, d);
    return dto;
  }
}
