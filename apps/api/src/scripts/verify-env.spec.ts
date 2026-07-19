import { verifyEnv } from './verify-env';

describe('verifyEnv (PD-002)', () => {
  const validBaseEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
  };

  it('accepts a minimal valid development environment', () => {
    expect(verifyEnv(validBaseEnv)).toEqual({ ok: true, errors: [] });
  });

  it('rejects a missing DATABASE_URL', () => {
    const { ok, errors } = verifyEnv({ JWT_ACCESS_SECRET: 'a'.repeat(32) });
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
  });

  it('rejects a JWT_ACCESS_SECRET shorter than 32 characters', () => {
    const { ok, errors } = verifyEnv({ ...validBaseEnv, JWT_ACCESS_SECRET: 'too-short' });
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes('JWT_ACCESS_SECRET'))).toBe(true);
  });

  it('requires CORS_ORIGIN, SMTP_HOST, and a matching AI key once NODE_ENV=production', () => {
    const { ok, errors } = verifyEnv({
      ...validBaseEnv,
      NODE_ENV: 'production',
      AI_PROVIDER: 'openai',
    });

    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes('CORS_ORIGIN'))).toBe(true);
    expect(errors.some((e) => e.includes('SMTP_HOST'))).toBe(true);
    expect(errors.some((e) => e.includes('OPENAI_API_KEY'))).toBe(true);
  });

  it('accepts a fully-configured production environment', () => {
    const { ok, errors } = verifyEnv({
      ...validBaseEnv,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.aureus.example',
      SMTP_HOST: 'smtp.example.com',
      AI_PROVIDER: 'stub',
    });

    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it('treats docker-compose-style empty-string values the same as unset', () => {
    const { ok } = verifyEnv({
      ...validBaseEnv,
      SMTP_HOST: '',
      SMTP_PORT: '',
      REDIS_URL: '',
      DATABASE_POOL_MAX: '',
    });
    expect(ok).toBe(true);
  });
});
