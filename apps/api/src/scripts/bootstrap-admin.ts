import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;
const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

/** The narrow slice of PrismaClient this bootstrap needs — kept minimal so it can be exercised with a plain mock in tests, without a real database connection. */
export interface BootstrapAdminClient {
  user: {
    findFirst(args: { where: Record<string, unknown>; select?: Record<string, boolean> }): Promise<{ id: string; email: string; roles: UserRole[] } | null>;
    update(args: { where: { id: string }; data: { roles: UserRole[] } }): Promise<unknown>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; email: string }>;
  };
}

export interface BootstrapAdminResult {
  outcome: 'skipped-existing-admin' | 'promoted-existing-user' | 'created-new-admin';
  message: string;
}

/**
 * Production admin bootstrap (PR-002). Registration (`POST /auth/register`)
 * always assigns MEMBER — there is no other path to a first administrative
 * account, so a fresh production database is otherwise unusable without a
 * manual database edit. Idempotent: a no-op if any administrator already
 * exists; promotes an existing member in place if the email is already
 * registered; otherwise creates a new SYSTEM_ADMINISTRATOR account, hashed
 * identically to AuthService.register() (bcrypt, 12 rounds) so it can log
 * in through the normal `/auth/login` endpoint with no special-cased path.
 */
export async function bootstrapAdmin(
  prisma: BootstrapAdminClient,
  email: string,
  password: string,
): Promise<BootstrapAdminResult> {
  const existingAdmin = await prisma.user.findFirst({
    where: { roles: { hasSome: ADMIN_ROLES }, deletedAt: null },
    select: { id: true, email: true },
  });
  if (existingAdmin) {
    return {
      outcome: 'skipped-existing-admin',
      message: `Administrator already exists (${existingAdmin.email}) — bootstrap is a no-op. Remove all administrator roles first if you intend to re-bootstrap.`,
    };
  }

  const existingByEmail = await prisma.user.findFirst({ where: { email } });
  if (existingByEmail) {
    const roles = Array.from(new Set([...existingByEmail.roles, UserRole.SYSTEM_ADMINISTRATOR]));
    await prisma.user.update({ where: { id: existingByEmail.id }, data: { roles } });
    return {
      outcome: 'promoted-existing-user',
      message: `Promoted existing user '${email}' to SYSTEM_ADMINISTRATOR.`,
    };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      roles: [UserRole.SYSTEM_ADMINISTRATOR],
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  return {
    outcome: 'created-new-admin',
    message: `Created the first administrator: ${admin.email} (id ${admin.id}). Sign in at /login with the configured BOOTSTRAP_ADMIN_PASSWORD, then rotate it immediately.`,
  };
}
