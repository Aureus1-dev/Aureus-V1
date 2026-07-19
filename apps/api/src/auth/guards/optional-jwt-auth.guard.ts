import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Runs the same 'jwt' Passport strategy as JwtAuthGuard, populating
 * `request.user` when a valid Bearer token is present — but never rejects
 * the request when it is absent or invalid (NestJS's AuthGuard.canActivate
 * always returns true as long as handleRequest doesn't throw, regardless of
 * what it returns). For public endpoints that need to know "who, if anyone,
 * is asking" (e.g. the content-visibility check on marketplace
 * findById/findByRef, PD-001) without requiring authentication.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user ? user : undefined;
  }
}
