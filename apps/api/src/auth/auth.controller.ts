import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyMfaLoginDto } from './dto/verify-mfa-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MfaChallengeResponseDto } from './dto/mfa-challenge-response.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';

// Brute-force protection (PR-002): tight per-IP limit on credential/token endpoints.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Guest Steward mode's front door needs its own limit, not the credential
 * one above.
 *
 * `AUTH_THROTTLE` exists to make password guessing expensive. `/auth/guest`
 * has no password to guess and no account to break into — it mints a
 * throwaway session — so a 5/minute ceiling bought no security here while
 * breaking the product's central promise: the sixth visitor from any
 * shared IP within a minute was turned away from a service that says no
 * account is required to ask for help. One office, campus, café or
 * mobile-carrier NAT reaches five in ordinary use, and each of those
 * people is a different human being.
 *
 * 30/minute is sized for a shared egress IP rather than for one person,
 * while still bounding automated abuse. The durable protection against
 * bulk guest creation is not this window but `GuestLifecycleService`,
 * which hard-deletes unclaimed guests after seven idle days — so a flood
 * of empty rows cleans itself up rather than accumulating.
 */
const GUEST_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Register a new member account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(GUEST_THROTTLE)
  @ApiOperation({ summary: 'Start an unauthenticated guest session — no email or password required. Guest Steward mode: the first Aureus experience never requires an account.' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  guest(): Promise<AuthResponseDto> {
    return this.authService.guest();
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Claim the caller\'s guest session by attaching a real email/password — same account id, so every conversation, need, and goal already built as a guest is preserved.' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 409, description: 'Not a guest session, or the email is already registered' })
  claim(@Body() dto: RegisterDto, @CurrentUser() caller: AuthenticatedUser): Promise<AuthResponseDto> {
    return this.authService.claimGuestAccount(caller.id, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Authenticate with email and password — returns an MfaChallengeResponseDto instead if MFA is enabled' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email address not yet verified' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto | MfaChallengeResponseDto> {
    return this.authService.login(dto);
  }

  @Post('mfa/verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Complete a login that returned an MFA challenge, with a TOTP or recovery code' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired challenge, or invalid code' })
  verifyMfaLogin(@Body() dto: VerifyMfaLoginDto): Promise<AuthResponseDto> {
    return this.authService.completeMfaLogin(dto.mfaToken, dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiResponse({ status: 200, type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiResponse({ status: 204 })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('logout-everywhere')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Revoke every refresh token for the caller, ending every other session' })
  @ApiResponse({ status: 204 })
  async logoutEverywhere(@CurrentUser() caller: AuthenticatedUser): Promise<void> {
    await this.authService.logoutEverywhere(caller.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Request a password reset token (always returns 204, regardless of whether the email exists)',
  })
  @ApiResponse({ status: 204 })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Complete a password reset using a valid reset token' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Confirm an account email address' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Re-send the email-verification link (always returns 204, regardless of whether the email exists or is already verified)',
  })
  @ApiResponse({ status: 204 })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.authService.resendVerificationEmail(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.findById(user.id);
  }
}
