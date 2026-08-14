import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function rootFile(path: string): string {
  return readFileSync(resolve(process.cwd(), '../..', path), 'utf8');
}

describe('PF-010 pilot operability contract', () => {
  it('pins the three-repository pilot release and keeps the first external client gated', () => {
    const manifest = JSON.parse(
      rootFile('docs/product-first/manifests/PF-010-pilot-manifest.json'),
    ) as any;

    expect(manifest.schemaVersion).toBe('pf010-pilot-manifest-v1');
    expect(manifest.repositories['Aureus-V1'].requiredParent).toBe(
      'bea7287cc9f0681002c30ba7918f2f20c256c5f3',
    );
    expect(manifest.repositories['Aureus-Foundry'].releaseCommit).toBe(
      'e6c0a4558145c6f00d5e7734be95af08daf8241a',
    );
    expect(manifest.repositories['Aureus-Library'].releaseCommit).toBe(
      'e217284d0b9d4e8e9cbca119c8257d202a34a5c7',
    );
    expect(manifest.pilot.durationDays).toBe(30);
    expect(manifest.pilot.vertical).toBe('KITCHEN_BATH');
    expect(manifest.pilot.phoneSmsIncluded).toBe(false);
    expect(manifest.pilot.phoneSmsSuccessor).toBe('PF-011');
    expect(manifest.pilot.externalClientAllowed).toBe(false);
    expect(manifest.pilot.externalClientGate).toMatch(/PF-012/);
  });

  it('keeps Render pilot deploys manual and production health DB-inclusive', () => {
    const render = rootFile('render.yaml');
    expect(render).toContain('healthCheckPath: /health/ready');
    expect((render.match(/autoDeployTrigger: off/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(render).toContain('AI_EMERGENCY_STOP');
    expect(render).toContain('AI_GLOBAL_DAILY_BUDGET_USD');
    expect(render).toContain('SENTRY_DSN');
  });

  it('pins real backup-before-migration behavior instead of a paper-only promise', () => {
    const migrate = rootFile('scripts/db-migrate-deploy.sh');
    const backup = rootFile('scripts/db-backup.sh');
    expect(migrate).toContain('db-backup.sh');
    expect(migrate).toContain('npx prisma migrate deploy');
    expect(migrate).toContain('npx prisma migrate status');
    expect(backup).toContain('pg_dump --format=custom');
  });
});
