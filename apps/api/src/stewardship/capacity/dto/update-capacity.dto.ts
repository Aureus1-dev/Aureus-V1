import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCapacityDto {
  @ApiProperty({ example: 30, minimum: 1, description: 'Maximum number of concurrently ACTIVE assigned members' })
  @IsInt() @Min(1)
  maxActiveMembers: number;
}
