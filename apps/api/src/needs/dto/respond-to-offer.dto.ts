import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RespondToOfferDto {
  @ApiProperty({ description: 'Whether the member accepted this offered resource' })
  @IsBoolean()
  accepted: boolean;
}
