import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { BusinessTenantMembershipGuard } from '../guards/business-tenant-membership.guard';
import {
  BUSINESS_KNOWLEDGE_NOTICE,
  BusinessKnowledgeService,
} from './business-knowledge.service';
import { CreateBusinessKnowledgeDto } from './dto/create-business-knowledge.dto';
import { ImportBusinessKnowledgeDto } from './dto/import-business-knowledge.dto';
import { ListBusinessKnowledgeQueryDto } from './dto/list-business-knowledge-query.dto';
import { RejectBusinessKnowledgeDto } from './dto/reject-business-knowledge.dto';
import { UpdateBusinessKnowledgeDto } from './dto/update-business-knowledge.dto';

@ApiTags('business-knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BusinessTenantMembershipGuard)
@Controller('organizations/:organizationId/business-knowledge')
export class BusinessKnowledgeController {
  constructor(private readonly service: BusinessKnowledgeService) {}

  @Get('notice')
  @ApiOperation({ summary: 'Return the source-assurance boundary shown in the workspace' })
  notice() {
    return { notice: BUSINESS_KNOWLEDGE_NOTICE };
  }

  @Get()
  @ApiOperation({ summary: 'List only the caller-scoped tenant knowledge records' })
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListBusinessKnowledgeQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.list(organizationId, query, caller);
  }

  @Post()
  @ApiOperation({ summary: 'Create a private DRAFT record by manual entry' })
  createManual(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateBusinessKnowledgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.createManual(organizationId, dto, caller);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Safely import pasted plain text or Markdown as unverified DRAFT source material',
  })
  importText(
    @Param('organizationId') organizationId: string,
    @Body() dto: ImportBusinessKnowledgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.importText(organizationId, dto, caller);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Tenant knowledge record UUID' })
  findOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.findOne(organizationId, id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit DRAFT or REJECTED tenant knowledge' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessKnowledgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.update(organizationId, id, dto, caller);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit DRAFT or REJECTED knowledge for accountable review' })
  submit(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.submit(organizationId, id, caller);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve UNDER_REVIEW knowledge for this tenant only' })
  approve(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.approve(organizationId, id, caller);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject UNDER_REVIEW knowledge with an accountable reason' })
  reject(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: RejectBusinessKnowledgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.reject(organizationId, id, dto, caller);
  }

  @Post(':id/library-candidate')
  @ApiOperation({
    summary: 'Snapshot APPROVED tenant knowledge as a candidate for later Library admission',
  })
  createLibraryCandidate(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.createLibraryCandidate(organizationId, id, caller);
  }
}
