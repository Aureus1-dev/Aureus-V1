import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';

/**
 * Guest Steward mode privacy lifecycle. Touches `guestLastActiveAt` on
 * every authenticated request a guest makes — real interaction, not
 * silent token refresh (`POST /auth/refresh` doesn't carry a Bearer
 * token, so it never reaches here) — so `GuestLifecycleService`'s
 * scheduled purge can tell an abandoned guest from one still using the
 * app. Registered globally (`APP_INTERCEPTOR`, app.module.ts) so every
 * route gets this for free, but it is a true no-op for every non-guest
 * request: real members never pay for a write they don't need.
 *
 * Deliberately NOT added to `JwtStrategy` (`auth/auth-guards.module.ts`):
 * that module is kept dependency-free from `UsersModule` specifically so
 * the many feature modules that import it for route protection never
 * risk a circular dependency. An interceptor, registered once at the
 * composition root (`AppModule`), reaches the same `request.user` after
 * the guard has already run, with no such coupling.
 *
 * Fire-and-forget by design: the update is never awaited, so a guest's
 * own request never pays extra latency for it, and a failure here (e.g.
 * a momentarily unreachable database) never turns into a 500 for an
 * otherwise-successful request.
 */
@Injectable()
export class GuestActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GuestActivityInterceptor.name);

  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (user?.isGuest) {
      this.users
        .update(user.id, { guestLastActiveAt: new Date() })
        .catch((error: unknown) => {
          this.logger.warn(`Failed to record guest activity for ${user.id}: ${String(error)}`);
        });
    }

    return next.handle();
  }
}
