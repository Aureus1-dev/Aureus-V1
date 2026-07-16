import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PodRequestStatus, PodRequestType } from '@prisma/client';
import type { PodRequest } from '@prisma/client';

export class CreateRequestDto {
  @ApiProperty({ enum: PodRequestType })
  @IsEnum(PodRequestType)
  type: PodRequestType;

  @ApiPropertyOptional({ description: 'Target Pod — required for JOIN/LEAVE/REASSIGNMENT, omitted for PROPOSE_NEW_POD' })
  @IsOptional() @IsUUID()
  podId?: string;

  @ApiPropertyOptional({ description: 'Only for PROPOSE_NEW_POD' })
  @IsOptional() @IsString() @MinLength(3)
  proposedPodName?: string;

  @ApiPropertyOptional({ description: 'Only for PROPOSE_NEW_POD' })
  @IsOptional() @IsString() @MinLength(10)
  proposedPodDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reason?: string;
}

export class DecideRequestDto {
  @ApiProperty()
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reason?: string;
}

export class RequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: PodRequestType }) type: PodRequestType;
  @ApiPropertyOptional({ nullable: true }) podId: string | null;
  @ApiPropertyOptional({ nullable: true }) proposedPodName: string | null;
  @ApiPropertyOptional({ nullable: true }) proposedPodDescription: string | null;
  @ApiPropertyOptional({ nullable: true }) reason: string | null;
  @ApiProperty({ enum: PodRequestStatus }) status: PodRequestStatus;
  @ApiPropertyOptional({ nullable: true }) decidedById: string | null;
  @ApiPropertyOptional({ nullable: true }) decidedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: PodRequest): RequestResponseDto {
    const dto = new RequestResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
