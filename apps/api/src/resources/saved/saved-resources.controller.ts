import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { SavedResourcesService } from './saved-resources.service';
import { SaveResourceDto, UpdateSavedResourceDto } from './dto/save-resource.dto';
import { SavedResourceResponseDto } from './dto/saved-resource-response.dto';

@ApiTags('saved-resources')
@Controller('users/:userId/saved-resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedResourcesController {
  constructor(private readonly service: SavedResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Save a resource for a user (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: SavedResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved resources' })
  save(
    @Param('userId') userId: string,
    @Body() dto: SaveResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedResourceResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.save(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a user's saved resources (self only)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: [SavedResourceResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only view their own saved resources' })
  findAll(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedResourceResponseDto[]> {
    this.assertSelf(caller, userId);
    return this.service.findByUser(userId);
  }

  @Patch(':resourceId')
  @ApiOperation({ summary: 'Update favorite flag or notes (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: SavedResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved resources' })
  update(
    @Param('userId') userId: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateSavedResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedResourceResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.update(userId, resourceId, dto);
  }

  @Delete(':resourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsave (remove) a saved resource (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved resources' })
  remove(
    @Param('userId') userId: string,
    @Param('resourceId') resourceId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    this.assertSelf(caller, userId);
    return this.service.remove(userId, resourceId);
  }

  private assertSelf(caller: AuthenticatedUser, userId: string): void {
    if (caller.id !== userId) {
      throw new ForbiddenException('You may only manage your own saved resources');
    }
  }
}
