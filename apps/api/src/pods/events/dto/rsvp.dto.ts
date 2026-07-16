import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RsvpResponse } from '@prisma/client';

export class RsvpDto {
  @ApiProperty({ enum: RsvpResponse })
  @IsEnum(RsvpResponse)
  response: RsvpResponse;
}
