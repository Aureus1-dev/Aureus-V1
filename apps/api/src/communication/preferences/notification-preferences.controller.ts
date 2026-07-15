import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferenceResponseDto } from './dto/preference-response.dto';

@ApiTags('communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({ summary: "List a user's notification preferences, one entry per category (self, or Administrator via ?userId=)" })
  @ApiQuery({ name: 'userId', required: false, description: 'Defaults to the caller; Administrator-only for other users' })
  @ApiResponse({ status: 200, type: [PreferenceResponseDto] })
  findAll(
    @Query('userId') userId: string | undefined,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PreferenceResponseDto[]> {
    return this.service.findAllForUser(userId ?? caller.id, caller);
  }

  @Patch(':category')
  @ApiOperation({ summary: 'Update channel preferences for one category (self, or Administrator via ?userId=)' })
  @ApiParam({ name: 'category', enum: NotificationCategory })
  @ApiQuery({ name: 'userId', required: false, description: 'Defaults to the caller; Administrator-only for other users' })
  @ApiResponse({ status: 200, type: PreferenceResponseDto })
  @ApiResponse({ status: 400, description: 'SYSTEM notifications cannot be disabled for the in-app channel' })
  update(
    @Param('category', new ParseEnumPipe(NotificationCategory)) category: NotificationCategory,
    @Body() dto: UpdatePreferenceDto,
    @Query('userId') userId: string | undefined,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PreferenceResponseDto> {
    return this.service.update(userId ?? caller.id, category, dto, caller);
  }
}
