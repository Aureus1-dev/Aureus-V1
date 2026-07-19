import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard (PD-001)', () => {
  const guard = new OptionalJwtAuthGuard();

  it('returns the authenticated user when Passport resolves one', () => {
    const user = { id: 'user-1', email: 'u@example.test', roles: ['MEMBER'] };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('returns undefined, without throwing, when no user is present (anonymous request)', () => {
    expect(() => guard.handleRequest(null, false)).not.toThrow();
    expect(guard.handleRequest(null, false)).toBeUndefined();
  });

  it('returns undefined, without throwing, when Passport reports an error (e.g. malformed/expired token)', () => {
    expect(() => guard.handleRequest(new Error('jwt expired'), false)).not.toThrow();
    expect(guard.handleRequest(new Error('jwt expired'), false)).toBeUndefined();
  });
});
