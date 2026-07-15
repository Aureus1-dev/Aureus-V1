import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectArticleDto {
  @ApiProperty({ example: 'Content contradicts current policy; needs revision before it can be published.' })
  @IsString() @MinLength(10)
  rejectionReason: string;
}
