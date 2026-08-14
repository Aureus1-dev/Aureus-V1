import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateWardLeadDto } from './dto/create-ward-lead.dto';
import { KitchenBathPublicService } from './kitchen-bath-public.service';

const PROFILE_THROTTLE = { default: { limit: 60, ttl: 60_000 } };
const HANDOFF_THROTTLE = { default: { limit: 3, ttl: 60 * 60_000 } };

@ApiTags('public-ward')
@Controller('public/wards/:slug')
export class KitchenBathPublicController {
  constructor(private readonly kitchenBath: KitchenBathPublicService) {}

  @Get('kitchen-bath-pack')
  @Throttle(PROFILE_THROTTLE)
  @ApiOperation({ summary: 'Report whether this published Ward has a current approved Kitchen & Bath pack' })
  profile(@Param('slug') slug: string) {
    return this.kitchenBath.profile(slug);
  }

  @Post('conversations/:conversationId/kitchen-bath-handoff')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(HANDOFF_THROTTLE)
  @ApiHeader({ name: 'x-ward-token', required: true })
  @ApiOperation({ summary: 'Create a consented handoff with governed Kitchen & Bath project intake' })
  submit(
    @Param('slug') slug: string,
    @Param('conversationId') conversationId: string,
    @Headers('x-ward-token') token: string | undefined,
    @Body() dto: CreateWardLeadDto,
  ) {
    return this.kitchenBath.submit(slug, conversationId, token, dto);
  }
}
