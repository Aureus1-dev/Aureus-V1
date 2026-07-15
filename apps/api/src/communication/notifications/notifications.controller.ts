import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsResponseDto } from './dto/paginated-notifications-response.dto';

@ApiTags('communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List your own notifications (paginated, filterable by category/read state)' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsResponseDto })
  findAll(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.service.findAll(query, caller);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all of your unread notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of notifications marked read' })
  markAllRead(@CurrentUser() caller: AuthenticatedUser): Promise<{ count: number }> {
    return this.service.markAllRead(caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID (owner or Administrator)' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 403, description: 'You may only access your own notifications' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    return this.service.findById(id, caller);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read (owner or Administrator)' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  markRead(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    return this.service.markRead(id, caller);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a notification (owner or Administrator)' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  archive(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    return this.service.archive(id, caller);
  }
}
