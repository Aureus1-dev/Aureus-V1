import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  ActivePeopleApplicationHelpResponseDto,
  CompletePeopleApplicationHelpResponseDto,
  PeopleApplicationHelpResponseDto,
  RecordPeopleApplicationOutcomeDto,
  StartPeopleApplicationHelpDto,
} from './people-help.dto';
import { PeopleHelpService } from './people-help.service';

class ActivePeopleApplicationHelpQueryDto {
  @IsUUID()
  conversationId!: string;
}

@ApiTags('people-help')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people-help/application')
export class PeopleHelpController {
  constructor(private readonly peopleHelp: PeopleHelpService) {}

  @Post()
  @ApiOperation({
    summary:
      'Accept or resume one personal application-help Responsibility and its verified See → Guide session',
  })
  @ApiResponse({ status: 201, type: PeopleApplicationHelpResponseDto })
  start(
    @Body() dto: StartPeopleApplicationHelpDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleApplicationHelpResponseDto> {
    return this.peopleHelp.start(dto, caller);
  }

  @Get('active')
  @ApiOperation({
    summary:
      'Return active application guidance plus its private Responsibility state for this owned conversation',
  })
  @ApiQuery({ name: 'conversationId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    type: ActivePeopleApplicationHelpResponseDto,
  })
  active(
    @Query() query: ActivePeopleApplicationHelpQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ActivePeopleApplicationHelpResponseDto | null> {
    return this.peopleHelp.findActive(query.conversationId, caller);
  }

  @Post(':sessionId/pause')
  @ApiOperation({
    summary:
      'Pause for now: revoke/end current guide and keep the Responsibility waiting for the member',
  })
  pause(
    @Param('sessionId') sessionId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<{ paused: true; responsibilityId: string | null }> {
    return this.peopleHelp.pause(sessionId, caller);
  }

  @Post(':sessionId/outcome')
  @ApiOperation({
    summary:
      'Record the member-reported application outcome and complete the bounded application-help Responsibility',
  })
  @ApiResponse({ status: 201, type: CompletePeopleApplicationHelpResponseDto })
  complete(
    @Param('sessionId') sessionId: string,
    @Body() dto: RecordPeopleApplicationOutcomeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CompletePeopleApplicationHelpResponseDto> {
    return this.peopleHelp.complete(sessionId, dto.outcome, caller);
  }
}
