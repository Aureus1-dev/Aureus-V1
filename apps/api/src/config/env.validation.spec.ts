import { envValidationSchema } from './env.validation';

const productionEnv = {
  DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/aureus',
  NODE_ENV: 'production',
  CORS_ORIGIN: 'https://aureus-v1.onrender.com',
  JWT_ACCESS_SECRET: '12345678901234567890123456789012',
  SMTP_HOST: 'smtp.example.com',
  AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-openai-key',
};

describe('envValidationSchema FRONTEND_URL', () => {
  it('requires a frontend URL in production instead of silently defaulting to localhost', () => {
    const { error } = envValidationSchema.validate(productionEnv, { abortEarly: false });

    expect(error?.message).toContain('FRONTEND_URL is required in production');
  });

  it.each([
    'http://localhost:3001',
    'https://localhost:3001',
    'https://127.0.0.1:3001',
  ])('rejects local production callback origin %s', (frontendUrl) => {
    const { error } = envValidationSchema.validate(
      { ...productionEnv, FRONTEND_URL: frontendUrl },
      { abortEarly: false },
    );

    expect(error).toBeDefined();
  });

  it('accepts the deployed pilot HTTPS origin in production', () => {
    const { error, value } = envValidationSchema.validate(
      { ...productionEnv, FRONTEND_URL: 'https://aureus-v1.onrender.com' },
      { abortEarly: false },
    );

    expect(error).toBeUndefined();
    expect(value.FRONTEND_URL).toBe('https://aureus-v1.onrender.com');
  });

  it('keeps the localhost default outside production for local development', () => {
    const { error, value } = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/aureus',
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
    });

    expect(error).toBeUndefined();
    expect(value.FRONTEND_URL).toBe('http://localhost:3001');
  });
});
