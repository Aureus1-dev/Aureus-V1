import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { LearningDomain } from '@prisma/client';

export class UpdateCourseDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10)
  fullDescription?: string;

  @ApiPropertyOptional({ enum: LearningDomain })
  @IsOptional() @IsEnum(LearningDomain)
  learningDomain?: LearningDomain;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  grantsCertification?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;
}
