import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StewardshipRelationshipStatus } from '@prisma/client';

export class ListRelationshipsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  memberId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  stewardId?: string;

  @ApiPropertyOptional({ enum: StewardshipRelationshipStatus })
  @IsOptional() @IsEnum(StewardshipRelationshipStatus)
  status?: StewardshipRelationshipStatus;
}
