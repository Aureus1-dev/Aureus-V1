import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { MediaAssetsService } from './media-assets.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { ListMediaAssetsQueryDto } from './dto/list-media-assets-query.dto';
import { MediaAssetResponseDto } from './dto/media-asset-response.dto';
import { PaginatedMediaAssetsResponseDto } from './dto/paginated-media-assets-response.dto';

/**
 * Steward Content Studio — part of the Academy, not a standalone domain
 * (founder's canonical WO-028 decision). Steward/Admin-only, matching
 * ACADEMY_STAFF_ROLES' content authority; storage is an opaque reference
 * only, no cloud provider implemented yet.
 */
@ApiTags('academy')
@Controller('academy/media')
export class MediaAssetsController {
  constructor(private readonly service: MediaAssetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a media asset (Steward / Admin) — storage reference only, no upload' })
  @ApiResponse({ status: 201, type: MediaAssetResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateMediaAssetDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List/search media assets (Steward / Admin)' })
  @ApiResponse({ status: 200, type: PaginatedMediaAssetsResponseDto })
  findAll(@Query() q: ListMediaAssetsQueryDto): Promise<PaginatedMediaAssetsResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a media asset by stable reference (e.g. AUR-MED-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-MED-000001' })
  @ApiResponse({ status: 200, type: MediaAssetResponseDto })
  findByRef(@Param('ref') ref: string): Promise<MediaAssetResponseDto> {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a media asset by UUID' })
  @ApiParam({ name: 'id', description: 'Media asset UUID' })
  @ApiResponse({ status: 200, type: MediaAssetResponseDto })
  findOne(@Param('id') id: string): Promise<MediaAssetResponseDto> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a media asset (uploader, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Media asset UUID' })
  @ApiResponse({ status: 200, type: MediaAssetResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this media asset or hold a moderation role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaAssetDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a media asset (uploader, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Media asset UUID' })
  @ApiResponse({ status: 403, description: 'Caller does not own this media asset or hold a moderation role' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }
}
