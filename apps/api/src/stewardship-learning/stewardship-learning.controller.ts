import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListLearningCandidatesQuery } from './dto/list-learning-candidates.query';
import { StewardshipLearningService } from './stewardship-learning.service';
import { StewardshipLearningCandidatePage } from './stewardship-learning.types';

@ApiTags('stewardship-learning')
@Controller('stewardship-learning')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
  UserRole.AI_SERVICE_ACCOUNT,
)
@ApiBearerAuth()
export class StewardshipLearningController {
  constructor(private readonly learning: StewardshipLearningService) {}

  @Get('candidates')
  @ApiOperation({
    summary: 'Project privacy-minimized People learning candidates from canonical evidence',
    description:
      'Read-only internal surface for Foundry/governance. Returns outcome_feedback candidates only; it does not change member state, authority, policy, or product behavior.',
  })
  @ApiResponse({ status: 200, description: 'Candidate-only learning projection' })
  listCandidates(
    @Query() query: ListLearningCandidatesQuery,
  ): Promise<StewardshipLearningCandidatePage> {
    return this.learning.listCandidates(query);
  }
}
