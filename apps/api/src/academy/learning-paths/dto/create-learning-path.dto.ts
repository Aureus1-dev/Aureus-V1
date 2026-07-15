import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLearningPathDto {
  @ApiProperty({ example: 'Financial Independence Track', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;
}
