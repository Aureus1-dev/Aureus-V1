import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConsentService } from './consent.service';
import { GrantConsentDto } from './dto/grant-consent.dto';
import { ConsentStatusResponseDto } from './dto/consent-status-response.dto';

@ApiTags('consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/consent')
export class ConsentController {
  constructor(private readonly service: ConsentService) {}

  @Post()
  @ApiOperation({ summary: 'Record that a member has granted arrival consent (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: ConsentStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only grant consent for themselves' })
  grant(
    @Param('userId') userId: string,
    @Body() dto: GrantConsentDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConsentStatusResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.grant(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get a member's current consent status (self only)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: ConsentStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only view their own consent status' })
  getStatus(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConsentStatusResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.getStatus(userId);
  }

  private assertSelf(caller: AuthenticatedUser, userId: string): void {
    if (caller.id !== userId) {
      throw new ForbiddenException('You may only manage your own consent record');
    }
  }
}
