import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectLearningPathDto {
  @ApiProperty({ example: 'Course sequencing needs revision before publication.' })
  @IsString() @MinLength(10)
  rejectionReason: string;
}
