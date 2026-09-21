/** @jest-environment node */

import { GET } from './route';

describe('GET /version', () => {
  const originalEnvironment = {
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT,
    AUREUS_COMMIT_SHA: process.env.AUREUS_COMMIT_SHA,
    RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID,
    RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID,
  };

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('reports the exact runtime deployment identity without caching it', async () => {
    process.env.RENDER_GIT_COMMIT = '0123456789abcdef0123456789abcdef01234567';
    process.env.AUREUS_COMMIT_SHA = 'ffffffffffffffffffffffffffffffffffffffff';
    process.env.RENDER_SERVICE_ID = 'srv-web';
    process.env.RENDER_INSTANCE_ID = 'instance-web';

    const response = GET();

    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      service: 'web',
      commit: '0123456789abcdef0123456789abcdef01234567',
      serviceId: 'srv-web',
      instanceId: 'instance-web',
    });
  });

  it('reports an unknown commit honestly instead of inventing release identity', async () => {
    delete process.env.RENDER_GIT_COMMIT;
    delete process.env.AUREUS_COMMIT_SHA;

    const response = GET();

    await expect(response.json()).resolves.toMatchObject({ service: 'web', commit: null });
  });
});
