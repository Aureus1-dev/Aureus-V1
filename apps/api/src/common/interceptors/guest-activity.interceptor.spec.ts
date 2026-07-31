import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { GuestActivityInterceptor } from './guest-activity.interceptor';
import { IUserRepository } from '../../users/repositories/user.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const mockUserRepo: jest.Mocked<Pick<IUserRepository, 'update'>> = {
  update: jest.fn(),
};

function makeContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const nextHandler: CallHandler = { handle: () => of('response') };

describe('GuestActivityInterceptor', () => {
  let interceptor: GuestActivityInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new GuestActivityInterceptor(mockUserRepo as unknown as IUserRepository);
  });

  it('touches guestLastActiveAt for a guest request, without blocking the response', (done) => {
    mockUserRepo.update.mockResolvedValue({} as never);
    const context = makeContext({ id: 'guest-1', email: 'x', roles: ['MEMBER'], isGuest: true });

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('response');
      expect(mockUserRepo.update).toHaveBeenCalledWith('guest-1', {
        guestLastActiveAt: expect.any(Date),
      });
      done();
    });
  });

  it('does nothing for a real (non-guest) member request', (done) => {
    const context = makeContext({ id: 'member-1', email: 'x', roles: ['MEMBER'], isGuest: false });

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('response');
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      done();
    });
  });

  it('does nothing for an unauthenticated request (no request.user)', (done) => {
    const context = makeContext(undefined);

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('response');
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      done();
    });
  });

  it('never lets a failed activity write reject or block the response', (done) => {
    mockUserRepo.update.mockRejectedValue(new Error('db unavailable'));
    const context = makeContext({ id: 'guest-1', email: 'x', roles: ['MEMBER'], isGuest: true });

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('response');
      done();
    });
  });
});
