import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  /**
   * Absent (or 'access') for a normal Bearer access token. Special-purpose,
   * short-lived tokens signed with the same secret — e.g. the MFA login
   * challenge (PD-001) — set this to a distinct value so they can never be
   * replayed as a Bearer access token against JwtAuthGuard-only endpoints.
   */
  type?: string;
  /**
   * Guest Steward mode (Production Execution Order). True for a session
   * issued by `POST /auth/guest` — embedded in the token itself (not
   * re-fetched per request) so the frontend can show/hide the account-
   * creation nudge without an extra round trip. Absent/false for every
   * other token.
   */
  isGuest?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  isGuest?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Return value is attached to `request.user` by Passport.
  validate(payload: JwtPayload): AuthenticatedUser {
    // Reject any special-purpose token (e.g. an MFA login challenge) that
    // happens to be signed with this same secret — only a normal access
    // token may authenticate a Bearer-guarded request.
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }
    return { id: payload.sub, email: payload.email, roles: payload.roles, isGuest: payload.isGuest };
  }
}
