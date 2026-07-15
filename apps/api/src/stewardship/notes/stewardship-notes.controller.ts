import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardshipNotesService } from './stewardship-notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteResponseDto } from './dto/note-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/relationships/:relationshipId/notes')
export class StewardshipNotesController {
  constructor(private readonly service: StewardshipNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a stewardship note (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 201, type: NoteResponseDto })
  @ApiResponse({ status: 403, description: 'Only the assigned steward may manage notes on this relationship' })
  create(
    @Param('relationshipId') relationshipId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NoteResponseDto> {
    return this.service.create(relationshipId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List notes (steward/Admin see all; the member sees only SHARED notes)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: [NoteResponseDto] })
  findAll(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NoteResponseDto[]> {
    return this.service.findByRelationship(relationshipId, caller);
  }

  @Patch(':noteId')
  @ApiOperation({ summary: 'Update a note (its author steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiParam({ name: 'noteId', description: 'Note UUID' })
  @ApiResponse({ status: 200, type: NoteResponseDto })
  update(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NoteResponseDto> {
    return this.service.update(noteId, dto, caller);
  }
}
