import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecommendStewardDto {
  @ApiProperty({ description: 'Member UUID the recommendation is for' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'Steward UUID being recommended' })
  @IsUUID()
  stewardId: string;
}
