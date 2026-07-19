import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { MfaService } from './mfa.service';
import { MfaEnrollmentResponseDto } from './dto/mfa-enrollment-response.dto';
import { ConfirmMfaDto } from './dto/confirm-mfa.dto';
import { MfaRecoveryCodesResponseDto } from './dto/mfa-recovery-codes-response.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';

// Mirrors the auth controller's own brute-force posture for credential-adjacent endpoints.
const MFA_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('enroll')
  @Throttle(MFA_THROTTLE)
  @ApiOperation({ summary: 'Begin TOTP enrollment for the caller — returns a secret and otpauth:// URI to render as a QR code' })
  @ApiResponse({ status: 201, type: MfaEnrollmentResponseDto })
  enroll(@CurrentUser() caller: AuthenticatedUser): Promise<MfaEnrollmentResponseDto> {
    return this.mfaService.beginEnrollment(caller.id, caller.email);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @Throttle(MFA_THROTTLE)
  @ApiOperation({ summary: 'Confirm enrollment with a TOTP code — enables MFA and returns one-time recovery codes' })
  @ApiResponse({ status: 200, type: MfaRecoveryCodesResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid authentication code' })
  async enable(
    @Body() dto: ConfirmMfaDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MfaRecoveryCodesResponseDto> {
    const recoveryCodes = await this.mfaService.confirmEnrollment(caller.id, dto.code);
    return { recoveryCodes };
  }

  @Post('disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(MFA_THROTTLE)
  @ApiOperation({ summary: 'Disable MFA for the caller — requires the current password to confirm' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async disable(@Body() dto: DisableMfaDto, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    await this.mfaService.disable(caller.id, dto.password);
  }
}
