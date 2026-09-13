import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorityService } from './authority.service';
import {
  AuthorityCapabilityControlDto,
  AuthorityEvaluationDto,
  AuthorityReasonDto,
  CreateAuthorityRequestDto,
} from './dto/authority.dto';

@ApiTags('authority')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('authority')
export class AuthorityController {
  constructor(private readonly service: AuthorityService) {}

  @Post('requests')
  createRequest(@Body() dto: CreateAuthorityRequestDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.createRequest(dto, caller);
  }

  @Post('requests/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.approve(id, caller);
  }

  @Post('requests/:id/deny')
  deny(@Param('id') id: string, @Body() dto: AuthorityReasonDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.deny(id, dto, caller);
  }

  @Post('grants/:id/revoke')
  revoke(@Param('id') id: string, @Body() dto: AuthorityReasonDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.revoke(id, dto, caller);
  }

  @Post('capabilities/suspend')
  suspend(@Body() dto: AuthorityCapabilityControlDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.suspend(dto, caller);
  }

  @Post('capabilities/resume')
  resume(@Body() dto: AuthorityCapabilityControlDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.resume(dto, caller);
  }

  @Post('evaluate')
  evaluate(@Body() dto: AuthorityEvaluationDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.evaluateForCaller(dto, caller);
  }

  @Get('trust')
  trust(@CurrentUser() caller: AuthenticatedUser) {
    return this.service.trustSnapshot(caller);
  }
}
