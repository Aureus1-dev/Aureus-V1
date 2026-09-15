import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  GuardianChildRelationshipResponseDto,
  GuardianChildSummaryDto,
} from './dto/guardian-child-relationship-response.dto';
import { ProposeGuardianChildRelationshipDto } from './dto/propose-guardian-child-relationship.dto';
import { FamilyService } from './family.service';

@ApiTags('family')
@Controller('family')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Post('relationships')
  @ApiOperation({ summary: 'Propose a guardian-child relationship; no authority exists until child assent' })
  @ApiResponse({ status: 201, type: GuardianChildRelationshipResponseDto })
  propose(
    @Body() dto: ProposeGuardianChildRelationshipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    return this.family.proposeRelationship(dto.childUserId, caller);
  }

  @Get('relationships/pending')
  @ApiOperation({ summary: 'List only pending guardian proposals addressed to the current child principal' })
  @ApiResponse({ status: 200, type: [GuardianChildRelationshipResponseDto] })
  listPending(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto[]> {
    return this.family.listPendingForChild(caller);
  }

  @Post('relationships/:id/assent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Child principal affirmatively assents to a pending guardian relationship' })
  @ApiResponse({ status: 200, type: GuardianChildRelationshipResponseDto })
  assent(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    return this.family.assentRelationship(id, caller);
  }

  @Post('relationships/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Either party revokes a guardian-child relationship' })
  @ApiResponse({ status: 200, type: GuardianChildRelationshipResponseDto })
  revoke(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    return this.family.revokeRelationship(id, caller);
  }

  @Get('children')
  @ApiOperation({ summary: 'List only children with an active, assented relationship to the caller' })
  @ApiResponse({ status: 200, type: [GuardianChildSummaryDto] })
  listChildren(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuardianChildSummaryDto[]> {
    return this.family.listChildren(caller);
  }
}
