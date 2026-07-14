import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import {
  ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ListOpportunitiesQueryDto } from './dto/list-opportunities-query.dto';
import { RejectOpportunityDto } from './dto/reject-opportunity.dto';
import { VerifyOpportunityDto } from './dto/verify-opportunity.dto';
import { OpportunityResponseDto } from './dto/opportunity-response.dto';
import { PaginatedOpportunitiesResponseDto } from './dto/paginated-opportunities-response.dto';

@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create an opportunity (Admin / Org / Business)' })
  @ApiResponse({ status: 201, type: OpportunityResponseDto })
  create(@Body() dto: CreateOpportunityDto): Promise<OpportunityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List/search opportunities (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedOpportunitiesResponseDto })
  findAll(@Query() q: ListOpportunitiesQueryDto): Promise<PaginatedOpportunitiesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get opportunity by stable reference (e.g. AUR-OPP-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-OPP-000001' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  findByRef(@Param('ref') ref: string): Promise<OpportunityResponseDto> {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by UUID' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  findOne(@Param('id') id: string): Promise<OpportunityResponseDto> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto): Promise<OpportunityResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }

  // ── Verification Workflow ─────────────────────────────────────────────────

  @Post(':id/submit-for-review')
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiBody({ schema: { properties: { submittedById: { type: 'string' } }, required: ['submittedById'] } })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  submitForReview(
    @Param('id') id: string,
    @Body('submittedById') submittedById: string,
  ): Promise<OpportunityResponseDto> {
    return this.service.submitForReview(id, submittedById);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Admin only)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyOpportunityDto,
  ): Promise<OpportunityResponseDto> {
    return this.service.verify(id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Admin only)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOpportunityDto,
  ): Promise<OpportunityResponseDto> {
    return this.service.reject(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiBody({ schema: { properties: { archivedById: { type: 'string' } }, required: ['archivedById'] } })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  archive(
    @Param('id') id: string,
    @Body('archivedById') archivedById: string,
  ): Promise<OpportunityResponseDto> {
    return this.service.archive(id, archivedById);
  }
}
