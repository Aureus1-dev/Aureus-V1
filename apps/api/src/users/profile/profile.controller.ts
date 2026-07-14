import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('profiles')
@Controller('users/:userId/profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create profile for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  create(@Param('userId') userId: string, @Body() dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.service.createOrGet(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get a user's profile" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  findOne(@Param('userId') userId: string): Promise<ProfileResponseDto> {
    return this.service.findByUserId(userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update a user's profile" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  update(@Param('userId') userId: string, @Body() dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.service.update(userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a user's profile" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  remove(@Param('userId') userId: string): Promise<void> { return this.service.remove(userId); }
}
