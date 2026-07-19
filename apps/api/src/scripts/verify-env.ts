import { envValidationSchema } from '../config/env.validation';

export interface EnvVerificationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Runs the same Joi schema `ConfigModule.forRoot()` validates against at
 * real boot, standalone (PD-002) — so a candidate environment can be
 * checked *before* a deploy, not just discovered broken when the container
 * crash-loops. Pure/testable: takes an explicit env object rather than
 * reading `process.env` itself.
 */
export function verifyEnv(env: Record<string, string | undefined>): EnvVerificationResult {
  const { error } = envValidationSchema.validate(env, { abortEarly: false, allowUnknown: true });
  if (!error) {
    return { ok: true, errors: [] };
  }
  return { ok: false, errors: error.details.map((d) => d.message) };
}
