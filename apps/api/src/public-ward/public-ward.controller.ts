import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendWardMessageDto } from './dto/send-ward-message.dto';
import { CreateWardLeadDto } from './dto/create-ward-lead.dto';
import { PublicWardService } from './public-ward.service';
import { WardLeadService } from './ward-lead.service';

const PROFILE_THROTTLE = { default: { limit: 60, ttl: 60_000 } };
const START_THROTTLE = { default: { limit: 15, ttl: 60_000 } };
const MESSAGE_THROTTLE = { default: { limit: 12, ttl: 60_000 } };
const HANDOFF_THROTTLE = { default: { limit: 3, ttl: 60 * 60_000 } };

@ApiTags('public-ward')
@Controller('public/wards/:slug')
export class PublicWardController {
  constructor(
    private readonly service: PublicWardService,
    private readonly leads: WardLeadService,
  ) {}

  @Get()
  @Throttle(PROFILE_THROTTLE)
  @ApiOperation({ summary: 'Load one published business Ward; no Aureus account required' })
  getPublicProfile(@Param('slug') slug: string) {
    return this.service.getPublicProfile(slug);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(START_THROTTLE)
  @ApiOperation({ summary: 'Start a tenant-isolated guest Ward conversation' })
  startConversation(@Param('slug') slug: string) {
    return this.service.startConversation(slug);
  }

  @Get('conversations/:conversationId')
  @Throttle(PROFILE_THROTTLE)
  @ApiHeader({
    name: 'x-ward-token',
    description: 'Opaque bearer token returned only when the conversation was created',
    required: true,
  })
  @ApiOperation({ summary: 'Resume only the bearer-authorized Ward conversation' })
  getConversation(
    @Param('slug') slug: string,
    @Param('conversationId') conversationId: string,
    @Headers('x-ward-token') token: string | undefined,
  ) {
    return this.service.getConversation(slug, conversationId, token);
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @Throttle(MESSAGE_THROTTLE)
  @ApiHeader({
    name: 'x-ward-token',
    description: 'Opaque bearer token returned only when the conversation was created',
    required: true,
  })
  @ApiOperation({ summary: 'Ask the Ward using only current approved tenant knowledge' })
  sendMessage(
    @Param('slug') slug: string,
    @Param('conversationId') conversationId: string,
    @Headers('x-ward-token') token: string | undefined,
    @Body() dto: SendWardMessageDto,
  ) {
    return this.service.sendMessage(slug, conversationId, token, dto.content);
  }

  @Post('conversations/:conversationId/handoff')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(HANDOFF_THROTTLE)
  @ApiHeader({
    name: 'x-ward-token',
    description: 'Opaque bearer token returned only when the conversation was created',
    required: true,
  })
  @ApiOperation({ summary: 'Explicitly consent to a tenant-scoped human handoff' })
  createHandoff(
    @Param('slug') slug: string,
    @Param('conversationId') conversationId: string,
    @Headers('x-ward-token') token: string | undefined,
    @Body() dto: CreateWardLeadDto,
  ) {
    return this.leads.submitPublicHandoff(slug, conversationId, token, dto);
  }

  @Delete('conversations/:conversationId/handoff')
  @HttpCode(HttpStatus.OK)
  @Throttle(HANDOFF_THROTTLE)
  @ApiHeader({
    name: 'x-ward-token',
    description:
      'Original private token; this deletion-only route remains usable during lead retention',
    required: true,
  })
  @ApiOperation({ summary: 'Delete the consented handoff and its attributed Ward conversation' })
  deleteHandoff(
    @Param('slug') slug: string,
    @Param('conversationId') conversationId: string,
    @Headers('x-ward-token') token: string | undefined,
  ) {
    return this.leads.deletePublicHandoff(slug, conversationId, token);
  }
}
