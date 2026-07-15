import { ApiProperty } from '@nestjs/swagger';
import type { StewardCapacity } from '@prisma/client';

export class CapacityResponseDto {
  @ApiProperty() stewardId: string;
  @ApiProperty() maxActiveMembers: number;
  @ApiProperty() updatedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(c: StewardCapacity): CapacityResponseDto {
    const dto = new CapacityResponseDto();
    Object.assign(dto, c);
    return dto;
  }
}
