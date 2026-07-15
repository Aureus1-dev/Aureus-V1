import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LessonProgressStatus } from '@prisma/client';

export class UpdateLessonProgressDto {
  @ApiProperty({ enum: LessonProgressStatus })
  @IsEnum(LessonProgressStatus)
  status: LessonProgressStatus;
}
