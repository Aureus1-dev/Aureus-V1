import { generateOpaqueToken, hashOpaqueToken } from './token.util';

describe('token.util', () => {
  it('generates a token whose hash matches hashOpaqueToken(token)', () => {
    const { token, tokenHash } = generateOpaqueToken();

    expect(token).toHaveLength(43); // base64url of 32 random bytes
    expect(tokenHash).toBe(hashOpaqueToken(token));
  });

  it('generates unique tokens on each call', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();

    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('produces a deterministic hash for the same input', () => {
    expect(hashOpaqueToken('fixed-value')).toBe(hashOpaqueToken('fixed-value'));
  });
});
