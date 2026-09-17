import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  AddLegalMatterDeadlineDto,
  AddLegalMatterFactDto,
  AddLegalMatterSourceDto,
  CheckLegalActionDto,
  CreateLegalMatterDto,
  ObserveLegalFactDto,
  ReportLegalMatterOutcomeDto,
  RequestLegalReviewDto,
  VerifyLegalSourceIdentityDto,
} from './legal-matters.dto';
import { LegalMattersService } from './legal-matters.service';

@ApiTags('legal-matters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/legal-matters')
export class LegalMattersController {
  constructor(private readonly matters: LegalMattersService) {}

  @Post()
  @ApiOperation({ summary: 'Open one legal Matter on an owned StatedNeed and canonical Personal Responsibility' })
  create(@Body() dto: CreateLegalMatterDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.matters.create(dto, caller);
  }

  @Get('active')
  active(
    @Query('conversationId') conversationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.activeForConversation(conversationId, caller);
  }

  @Get(':matterId')
  findOne(@Param('matterId') matterId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.matters.findOne(matterId, caller);
  }

  @Post(':matterId/sources')
  addSource(
    @Param('matterId') matterId: string,
    @Body() dto: AddLegalMatterSourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.addSource(matterId, dto, caller);
  }

  @Post(':matterId/facts')
  addFact(
    @Param('matterId') matterId: string,
    @Body() dto: AddLegalMatterFactDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.addFact(matterId, dto, caller);
  }

  @Post(':matterId/deadlines')
  addDeadline(
    @Param('matterId') matterId: string,
    @Body() dto: AddLegalMatterDeadlineDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.addDeadline(matterId, dto, caller);
  }

  @Post(':matterId/documents/:documentId')
  linkDocument(
    @Param('matterId') matterId: string,
    @Param('documentId') documentId: string,
    @Body() body: { label?: string },
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.linkDocument(matterId, documentId, body.label, caller);
  }

  @Post(':matterId/legal-review')
  requestReview(
    @Param('matterId') matterId: string,
    @Body() dto: RequestLegalReviewDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.requestReview(matterId, dto, caller);
  }

  @Post(':matterId/action-check')
  checkAction(
    @Param('matterId') matterId: string,
    @Body() dto: CheckLegalActionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.checkAction(matterId, dto, caller);
  }

  @Post(':matterId/outcome')
  reportOutcome(
    @Param('matterId') matterId: string,
    @Body() dto: ReportLegalMatterOutcomeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.matters.reportOutcome(matterId, dto, caller);
  }

  @Get(':matterId/preparation-packet')
  packet(@Param('matterId') matterId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.matters.preparationPacket(matterId, caller);
  }
}

@ApiTags('legal-matters-internal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
@Controller('internal/legal-matters')
export class LegalMattersInternalController {
  constructor(private readonly matters: LegalMattersService) {}

  @Post(':matterId/sources/:sourceId/verify-identity')
  verifySourceIdentity(
    @Param('matterId') matterId: string,
    @Param('sourceId') sourceId: string,
    @Body() dto: VerifyLegalSourceIdentityDto,
    @CurrentUser() reviewer: AuthenticatedUser,
  ) {
    return this.matters.verifySourceIdentity(matterId, sourceId, dto, reviewer.id);
  }

  @Post(':matterId/facts/observe')
  observeFact(
    @Param('matterId') matterId: string,
    @Body() dto: ObserveLegalFactDto,
    @CurrentUser() reviewer: AuthenticatedUser,
  ) {
    return this.matters.observeFact(matterId, dto, reviewer.id);
  }

  @Post(':matterId/review/complete')
  completeReview(
    @Param('matterId') matterId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
  ) {
    return this.matters.completeReview(matterId, reviewer.id);
  }
}
