import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectOrganizationDto {
  @ApiProperty({ example: 'Unable to verify legal organization status from the provided website.' })
  @IsString() @MinLength(10)
  rejectionReason: string;
}
