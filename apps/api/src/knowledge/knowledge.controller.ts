import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { KnowledgeService } from './knowledge.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { RejectArticleDto } from './dto/reject-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';
import { PaginatedArticlesResponseDto } from './dto/paginated-articles-response.dto';
import { RevisionResponseDto } from './dto/revision-response.dto';

const CREATOR_ROLES = [
  UserRole.STEWARD,
  UserRole.ORGANIZATION_REPRESENTATIVE,
  UserRole.BUSINESS_REPRESENTATIVE,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];
const MODERATOR_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@ApiTags('knowledge')
@Controller('knowledge/articles')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CREATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a knowledge article (Steward / Org / Business / Admin)' })
  @ApiResponse({ status: 201, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search knowledge articles (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedArticlesResponseDto })
  findAll(@Query() q: ListArticlesQueryDto): Promise<PaginatedArticlesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get an article by stable reference (e.g. AUR-KB-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-KB-000001' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  findByRef(@Param('ref') ref: string): Promise<ArticleResponseDto> {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an article by UUID' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  findOne(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.service.findById(id);
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: 'Get an article\'s revision history, newest first' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: [RevisionResponseDto] })
  findRevisions(@Param('id') id: string): Promise<RevisionResponseDto[]> {
    return this.service.findRevisions(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an article (author, Steward, or Admin) — a substantive edit creates a revision snapshot' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this article or hold a moderation role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an article (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this article or hold a moderation role' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  @Post(':id/submit-for-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this article or hold a moderation role' })
  @ApiResponse({ status: 409, description: 'Article is not in DRAFT status' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.submitForReview(id, caller);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Article is not in PENDING_REVIEW status' })
  verify(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.verify(id, caller);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Article is not in PENDING_REVIEW status' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectArticleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.reject(id, dto, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an article (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, type: ArticleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this article or hold a moderation role' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    return this.service.archive(id, caller);
  }
}
