import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { LearningDomain } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ example: 'Financial Literacy Fundamentals', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;

  @ApiProperty({ enum: LearningDomain })
  @IsEnum(LearningDomain)
  learningDomain: LearningDomain;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ default: false, description: 'Auto-issues a Certification on completion' })
  @IsOptional() @IsBoolean()
  grantsCertification?: boolean;

  @ApiPropertyOptional({ description: 'Optional Business Portal attribution — the organization this course is offered in partnership with' })
  @IsOptional() @IsUUID()
  organizationId?: string;
}
