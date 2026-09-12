import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    description: "UUID of the existing member who will become the organization's new OWNER",
  })
  @IsUUID()
  newOwnerUserId: string;
}
