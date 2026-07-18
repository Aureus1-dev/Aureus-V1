import { UserRole } from '@prisma/client';
import { bootstrapAdmin, BootstrapAdminClient } from './bootstrap-admin';

function makeClient(overrides: Partial<BootstrapAdminClient['user']> = {}): BootstrapAdminClient {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      create: jest.fn(),
      ...overrides,
    },
  };
}

describe('bootstrapAdmin', () => {
  it('is a no-op when an administrator already exists', async () => {
    const client = makeClient({
      findFirst: jest.fn().mockResolvedValue({ id: 'u-1', email: 'existing-admin@example.com', roles: [UserRole.SYSTEM_ADMINISTRATOR] }),
    });

    const result = await bootstrapAdmin(client, 'new-admin@example.com', 'Str0ng!Passw0rd1');

    expect(result.outcome).toBe('skipped-existing-admin');
    expect(result.message).toContain('existing-admin@example.com');
    expect(client.user.create).not.toHaveBeenCalled();
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it('promotes an existing member in place rather than creating a duplicate', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // no existing admin
      .mockResolvedValueOnce({ id: 'u-2', email: 'member@example.com', roles: [UserRole.MEMBER] }); // existing user by email
    const client = makeClient({ findFirst });

    const result = await bootstrapAdmin(client, 'member@example.com', 'Str0ng!Passw0rd1');

    expect(result.outcome).toBe('promoted-existing-user');
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 'u-2' },
      data: { roles: [UserRole.MEMBER, UserRole.SYSTEM_ADMINISTRATOR] },
    });
    expect(client.user.create).not.toHaveBeenCalled();
  });

  it('does not duplicate SYSTEM_ADMINISTRATOR if the existing user already has it alongside other roles', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'u-3', email: 'steward@example.com', roles: [UserRole.STEWARD, UserRole.SYSTEM_ADMINISTRATOR] });
    const client = makeClient({ findFirst });

    await bootstrapAdmin(client, 'steward@example.com', 'Str0ng!Passw0rd1');

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 'u-3' },
      data: { roles: [UserRole.STEWARD, UserRole.SYSTEM_ADMINISTRATOR] },
    });
  });

  it('creates a new administrator with a bcrypt-hashed password when no admin and no matching email exist', async () => {
    const client = makeClient({
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'u-4', email: 'first-admin@example.com' }),
    });

    const result = await bootstrapAdmin(client, 'first-admin@example.com', 'Str0ng!Passw0rd1');

    expect(result.outcome).toBe('created-new-admin');
    expect(client.user.create).toHaveBeenCalledTimes(1);
    const createArgs = (client.user.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.data.email).toBe('first-admin@example.com');
    expect(createArgs.data.roles).toEqual([UserRole.SYSTEM_ADMINISTRATOR]);
    expect(createArgs.data.emailVerified).toBe(true);
    expect(createArgs.data.passwordHash).not.toBe('Str0ng!Passw0rd1');
    expect(createArgs.data.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
