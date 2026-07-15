import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';
import type { Notification, NotificationDelivery } from '@prisma/client';
import { DeliveryResponseDto } from './delivery-response.dto';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() recipientId: string;
  @ApiProperty({ enum: NotificationCategory }) category: NotificationCategory;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ required: false, nullable: true }) data: unknown;
  @ApiProperty({ required: false, nullable: true }) actorId: string | null;
  @ApiProperty({ required: false, nullable: true }) readAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) archivedAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) expiresAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [DeliveryResponseDto], required: false }) deliveries?: DeliveryResponseDto[];

  static fromEntity(n: Notification, deliveries?: NotificationDelivery[]): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    Object.assign(dto, n);
    if (deliveries) dto.deliveries = deliveries.map(DeliveryResponseDto.fromEntity);
    return dto;
  }
}
