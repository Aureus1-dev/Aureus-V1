import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePreferenceDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() digestEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 23, description: 'Reserved for a future scheduled-digest capability; not enforced in V1.' })
  @IsOptional() @IsInt() @Min(0) @Max(23)
  quietHoursStart?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 23, description: 'Reserved for a future scheduled-digest capability; not enforced in V1.' })
  @IsOptional() @IsInt() @Min(0) @Max(23)
  quietHoursEnd?: number;
}
