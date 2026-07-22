import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
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
import { CitySheetService } from './city-sheet.service';
import { CreateCitySheetEntryDto } from './dto/create-city-sheet-entry.dto';
import { UpdateCitySheetEntryDto } from './dto/update-city-sheet-entry.dto';
import { ListCitySheetEntriesQueryDto } from './dto/list-city-sheet-entries-query.dto';
import { VerifyCitySheetEntryDto } from './dto/verify-city-sheet-entry.dto';
import { FlagCitySheetEntryForReviewDto } from './dto/flag-city-sheet-entry-for-review.dto';
import { CitySheetEntryResponseDto } from './dto/city-sheet-entry-response.dto';
import { PaginatedCitySheetEntriesResponseDto } from './dto/paginated-city-sheet-entries-response.dto';

// City sheet entries have no per-entry owner (LAUNCH-001: "Ownership: stewards +
// Founder") — unlike the Resource directory, any Steward or Platform
// Administrator (the Founder's operating role) may manage any entry.
const MANAGER_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

@ApiTags('city-sheet')
@Controller('city-sheet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MANAGER_ROLES)
@ApiBearerAuth()
export class CitySheetController {
  constructor(private readonly service: CitySheetService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a city sheet entry (Steward / Founder only)' })
  @ApiResponse({ status: 201, type: CitySheetEntryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateCitySheetEntryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search city sheet entries (Steward / Founder only)' })
  @ApiResponse({ status: 200, type: PaginatedCitySheetEntriesResponseDto })
  findAll(@Query() q: ListCitySheetEntriesQueryDto): Promise<PaginatedCitySheetEntriesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get a city sheet entry by stable reference (e.g. AUR-CS-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-CS-000001' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  findByRef(@Param('ref') ref: string): Promise<CitySheetEntryResponseDto> {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a city sheet entry by UUID' })
  @ApiParam({ name: 'id', description: 'City sheet entry UUID' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  findOne(@Param('id') id: string): Promise<CitySheetEntryResponseDto> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a city sheet entry (Steward / Founder only)' })
  @ApiParam({ name: 'id', description: 'City sheet entry UUID' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCitySheetEntryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Mark a city sheet entry INACTIVE (Steward / Founder only)' })
  @ApiParam({ name: 'id', description: 'City sheet entry UUID' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    return this.service.archive(id, caller);
  }

  // ── Verification lifecycle ───────────────────────────────────────────

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify UNVERIFIED/NEEDS_REVIEW → VERIFIED (Steward / Founder only)' })
  @ApiParam({ name: 'id', description: 'City sheet entry UUID' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Entry is already VERIFIED' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyCitySheetEntryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    return this.service.verify(id, dto, caller);
  }

  @Post(':id/flag-for-review')
  @ApiOperation({ summary: 'Flag VERIFIED → NEEDS_REVIEW (Steward / Founder only)' })
  @ApiParam({ name: 'id', description: 'City sheet entry UUID' })
  @ApiResponse({ status: 200, type: CitySheetEntryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Entry is not currently VERIFIED' })
  flagForReview(
    @Param('id') id: string,
    @Body() dto: FlagCitySheetEntryForReviewDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    return this.service.flagForReview(id, dto, caller);
  }
}
