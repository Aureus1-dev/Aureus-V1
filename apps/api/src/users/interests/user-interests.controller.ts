import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpportunityCategory } from '@prisma/client';
import { UserInterestsService } from './user-interests.service';
import { AddInterestDto, InterestResponseDto } from './dto/interest-dto';

@ApiTags('interests')
@Controller('users/:userId/interests')
export class UserInterestsController {
  constructor(private readonly service: UserInterestsService) {}

  @Post()
  @ApiOperation({ summary: 'Add an interest category (recommendation foundation)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: InterestResponseDto })
  add(@Param('userId') userId: string, @Body() dto: AddInterestDto): Promise<InterestResponseDto> {
    return this.service.add(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a user's interest categories" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: [InterestResponseDto] })
  findAll(@Param('userId') userId: string): Promise<InterestResponseDto[]> {
    return this.service.findByUser(userId);
  }

  @Delete(':category')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an interest category' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'category', enum: OpportunityCategory })
  remove(
    @Param('userId') userId: string,
    @Param('category') category: OpportunityCategory,
  ): Promise<void> {
    return this.service.remove(userId, category);
  }
}
