import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateBusinessResponsibilityDto {
  @ApiProperty({ description: 'Caller-generated idempotency key for this accepted promise.' })
  @IsUUID()
  requestKey!: string;

  @ApiProperty({ description: 'The outcome Aureus is accepting responsibility to help carry.' })
  @IsString() @MinLength(3) @MaxLength(500)
  objective!: string;

  @ApiProperty({ description: 'Plain-language promise Aureus is making about this work.' })
  @IsString() @MinLength(3) @MaxLength(1000)
  promise!: string;

  @ApiProperty({ description: 'Plain-language criterion that must be true before completion may be reported.' })
  @IsString() @MinLength(3) @MaxLength(1000)
  criterion!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dueAt?: string;
}

export class ConfirmBusinessResponsibilityCompletionDto {
  @ApiProperty({ description: 'Explicit current-manager attestation. False is rejected.' })
  @IsBoolean()
  confirmed!: boolean;
}

export class CancelBusinessResponsibilityDto {
  @ApiPropertyOptional({ description: 'Short non-secret cancellation reason. Stored only in the tenant audit event.' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
