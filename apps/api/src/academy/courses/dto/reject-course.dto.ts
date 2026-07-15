import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectCourseDto {
  @ApiProperty({ example: 'Content needs additional review before publication.' })
  @IsString() @MinLength(10)
  rejectionReason: string;
}
