import { ApiProperty } from '@nestjs/swagger';
import { StewardshipNoteVisibility } from '@prisma/client';
import type { StewardshipNote } from '@prisma/client';

export class NoteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() relationshipId: string;
  @ApiProperty() authorId: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: StewardshipNoteVisibility }) visibility: StewardshipNoteVisibility;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(n: StewardshipNote): NoteResponseDto {
    const dto = new NoteResponseDto();
    Object.assign(dto, n);
    return dto;
  }
}
