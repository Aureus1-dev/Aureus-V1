import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodEventsService } from './pod-events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { EventResponseDto, PrefillDefaultsResponseDto, RsvpResponseDto } from './dto/event-response.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PodEventsController {
  constructor(private readonly service: PodEventsService) {}

  @Get('pods/:podId/events/prefill-defaults')
  @ApiOperation({ summary: 'Cadence/location/duration defaults for the next meeting, pulled from this Pod\'s schedule (Founder Decision #10)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PrefillDefaultsResponseDto })
  getPrefillDefaults(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<PrefillDefaultsResponseDto> {
    return this.service.getPrefillDefaults(podId, caller);
  }

  @Post('pods/:podId/events')
  @ApiOperation({ summary: 'Create a Pod event — always an intentional act by the Steward (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 201, type: EventResponseDto })
  create(@Param('podId') podId: string, @Body() dto: CreateEventDto, @CurrentUser() caller: AuthenticatedUser): Promise<EventResponseDto> {
    return this.service.create(podId, dto, caller);
  }

  @Get('pods/:podId/events')
  @ApiOperation({ summary: 'List this Pod\'s events' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  findForPod(@Param('podId') podId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.findForPod(podId, Number(page), Number(limit));
  }

  @Get('pods/events/:id')
  @ApiOperation({ summary: 'Get a Pod event by UUID' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  findOne(@Param('id') id: string): Promise<EventResponseDto> {
    return this.service.findById(id);
  }

  @Patch('pods/events/:id')
  @ApiOperation({ summary: 'Update a Pod event (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() caller: AuthenticatedUser): Promise<EventResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Post('pods/events/:id/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled Pod event (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  cancel(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<EventResponseDto> {
    return this.service.cancel(id, caller);
  }

  @Post('pods/events/:id/complete')
  @ApiOperation({ summary: 'Mark a Pod event as held (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  complete(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<EventResponseDto> {
    return this.service.complete(id, caller);
  }

  @Post('pods/events/:id/rsvp')
  @ApiOperation({ summary: 'RSVP to an upcoming event (any active Pod member)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  rsvp(@Param('id') id: string, @Body() dto: RsvpDto, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.rsvp(id, dto, caller);
  }

  @Get('pods/events/:id/rsvps')
  @ApiOperation({ summary: 'Upcoming RSVPs — visible to fellow Pod members (Founder Decision #5)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  @ApiResponse({ status: 200, type: [RsvpResponseDto] })
  findRsvps(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<RsvpResponseDto[]> {
    return this.service.findUpcomingRsvps(id, caller);
  }

  @Post('pods/events/:id/attendance')
  @ApiOperation({ summary: 'Mark a member\'s attendance after the fact — Steward-only, never a performance metric (Founder Decision #5)' })
  @ApiParam({ name: 'id', description: 'PodEvent UUID' })
  markAttendance(@Param('id') id: string, @Body() dto: MarkAttendanceDto, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.markAttendance(id, dto, caller);
  }
}
