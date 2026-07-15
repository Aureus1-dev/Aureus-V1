import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { PaginatedAnnouncementsResponseDto } from './dto/paginated-announcements-response.dto';

@ApiTags('communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a DRAFT announcement (authority depends on scope — see PA-015)' })
  @ApiResponse({ status: 201, type: AnnouncementResponseDto })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List announcements — Administrators see the full lifecycle; everyone else sees only PUBLISHED announcements addressed to them' })
  @ApiResponse({ status: 200, type: PaginatedAnnouncementsResponseDto })
  findAll(
    @Query() query: ListAnnouncementsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedAnnouncementsResponseDto> {
    return this.service.findAll(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an announcement by ID (author, Administrator, or — once PUBLISHED — its audience)' })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a DRAFT announcement (author-scope authority or Administrator)' })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @ApiResponse({ status: 409, description: 'Only a DRAFT announcement may be edited' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<AnnouncementResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a DRAFT/SCHEDULED announcement, fanning out one notification per resolved recipient' })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @ApiResponse({ status: 409, description: 'Announcement is not DRAFT or SCHEDULED' })
  publish(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    return this.service.publish(id, caller);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive an announcement (author-scope authority or Administrator)' })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  archive(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    return this.service.archive(id, caller);
  }
}
