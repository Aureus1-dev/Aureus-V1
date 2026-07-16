import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodInvitationsService } from './pod-invitations.service';
import { CreateInvitationDto, InvitationResponseDto, RespondToInvitationDto } from './dto/invitation.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PodInvitationsController {
  constructor(private readonly service: PodInvitationsService) {}

  @Post('pods/:podId/invitations')
  @ApiOperation({ summary: 'Invite a specific person — Home Pod: Steward/Admin only; Interest Pod: any active member (Founder Decision #3)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  create(@Param('podId') podId: string, @Body() dto: CreateInvitationDto, @CurrentUser() caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    return this.service.create(podId, dto, caller);
  }

  @Get('pods/invitations/mine')
  @ApiOperation({ summary: 'List invitations I have received' })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<InvitationResponseDto[]> {
    return this.service.findMine(caller);
  }

  @Post('pods/invitations/:id/respond')
  @ApiOperation({ summary: 'Accept or decline an invitation (the invited person only)' })
  @ApiParam({ name: 'id', description: 'PodInvitation UUID' })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  respond(@Param('id') id: string, @Body() dto: RespondToInvitationDto, @CurrentUser() caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    return this.service.respond(id, dto, caller);
  }
}
