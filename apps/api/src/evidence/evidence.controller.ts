import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CreateEvidenceRequirementDto,
  SubmitEvidenceItemDto,
  VerifyEvidenceItemDto,
  WaiveEvidenceRequirementDto,
} from './dto/evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('people-evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('responsibilities/:responsibilityId/requirements')
  @ApiOperation({
    summary:
      'Open an evidence requirement on an owned Personal Need Responsibility (authorized Steward or administrator only)',
  })
  createRequirement(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: CreateEvidenceRequirementDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.createRequirement(responsibilityId, dto, caller);
  }

  @Get('responsibilities/:responsibilityId/requirements')
  @ApiOperation({ summary: 'List evidence requirements for a Responsibility' })
  listRequirements(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.listRequirements(responsibilityId, caller);
  }

  @Get('responsibilities/:responsibilityId/summary')
  @ApiOperation({
    summary:
      'Truthful aggregate evidence sufficiency for a Responsibility — the Step 5 integration seam',
  })
  summary(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.responsibilitySummary(responsibilityId, caller);
  }

  @Post('responsibilities/:responsibilityId/attempt-completion')
  @ApiOperation({
    summary:
      'Complete the Responsibility only if every active evidence requirement is currently ADEQUATE (principal only)',
  })
  attemptCompletion(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.attemptResponsibilityCompletion(responsibilityId, caller);
  }

  @Get('requirements/:requirementId')
  @ApiOperation({ summary: 'Get one evidence requirement and its item/verification history' })
  getRequirement(
    @Param('requirementId') requirementId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.getRequirement(requirementId, caller);
  }

  @Post('requirements/:requirementId/waive')
  @ApiOperation({ summary: 'Waive an OPEN requirement (principal or administrator only)' })
  waive(
    @Param('requirementId') requirementId: string,
    @Body() dto: WaiveEvidenceRequirementDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.waiveRequirement(requirementId, dto, caller);
  }

  @Post('requirements/:requirementId/items')
  @ApiOperation({
    summary:
      'Submit (or supersede) one evidence item for a requirement. Uploading is not verification.',
  })
  submitItem(
    @Param('requirementId') requirementId: string,
    @Body() dto: SubmitEvidenceItemDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.submitItem(requirementId, dto, caller);
  }

  @Post('items/:itemId/verify')
  @ApiOperation({
    summary:
      'Independently verify, reject, or flag one evidence item (authorized Steward or administrator only; never the subject themselves)',
  })
  verifyItem(
    @Param('itemId') itemId: string,
    @Body() dto: VerifyEvidenceItemDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.evidence.verifyItem(itemId, dto, caller);
  }
}
