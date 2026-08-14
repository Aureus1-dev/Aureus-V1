import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TelephonyContinuityService } from './telephony-continuity.service';

class RedeemContinuationDto {
  @ApiProperty({ description: 'Opaque signed continuation token delivered over SMS' })
  @IsString()
  @MinLength(40)
  continuationToken: string;
}

@ApiTags('public-ward-telephony')
@Controller('public/wards/:slug/telephony')
export class TelephonyContinuityController {
  constructor(private readonly continuity: TelephonyContinuityService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'x-telephony-webhook-secret',
    required: true,
    description: 'Shared secret used only by the configured telephony adapter',
  })
  @ApiOperation({
    summary: 'Create a tenant Ward conversation plus a short-lived phone-to-web continuation URL',
  })
  start(
    @Param('slug') slug: string,
    @Headers('x-telephony-webhook-secret') webhookSecret: string | undefined,
  ) {
    return this.continuity.startPhoneContinuity(slug, webhookSecret);
  }

  @Post('continuations/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem a short-lived SMS continuation and rotate the Ward bearer secret' })
  redeem(@Param('slug') slug: string, @Body() dto: RedeemContinuationDto) {
    return this.continuity.redeem(slug, dto.continuationToken);
  }
}
