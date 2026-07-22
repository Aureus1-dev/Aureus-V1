import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CitySheetCategory, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ChecklistItemsService } from './checklist-items.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ChecklistItemResponseDto } from './dto/checklist-item-response.dto';

// Editing the verification methodology itself is an operational/admin
// decision distinct from any single verify/reject call — Platform
// Administrator only (Operations/Founder), not every Steward.
@ApiTags('city-sheet')
@Controller('city-sheet/checklist-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMINISTRATOR)
@ApiBearerAuth()
export class ChecklistItemsController {
  constructor(private readonly service: ChecklistItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a verification checklist item (Platform Administrator only)' })
  @ApiResponse({ status: 201, type: ChecklistItemResponseDto })
  @ApiResponse({ status: 409, description: 'An item with this label already exists for this category' })
  create(@Body() dto: CreateChecklistItemDto): Promise<ChecklistItemResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List verification checklist items (Platform Administrator only)' })
  @ApiQuery({ name: 'category', enum: CitySheetCategory, required: false })
  @ApiQuery({ name: 'includeInactive', type: Boolean, required: false })
  @ApiResponse({ status: 200, type: [ChecklistItemResponseDto] })
  findAll(
    @Query('category') category?: CitySheetCategory,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<ChecklistItemResponseDto[]> {
    return this.service.findAll(category, includeInactive);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or retire a checklist item (Platform Administrator only)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: ChecklistItemResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateChecklistItemDto): Promise<ChecklistItemResponseDto> {
    return this.service.update(id, dto);
  }
}
