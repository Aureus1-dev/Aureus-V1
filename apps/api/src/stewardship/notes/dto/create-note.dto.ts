import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StewardshipNoteVisibility } from '@prisma/client';

export class CreateNoteDto {
  @ApiProperty({ example: 'Discussed progress on the current milestone; member is on track.' })
  @IsString() @MinLength(1)
  content: string;

  @ApiPropertyOptional({
    enum: StewardshipNoteVisibility,
    default: StewardshipNoteVisibility.PRIVATE,
    description: 'PRIVATE notes are never visible to the member; only SHARED notes are.',
  })
  @IsOptional() @IsEnum(StewardshipNoteVisibility)
  visibility?: StewardshipNoteVisibility;
}
