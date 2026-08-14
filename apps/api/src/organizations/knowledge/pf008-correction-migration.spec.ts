import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PF-008 reviewed correction migration', () => {
  const sql = readFileSync(
    resolve(
      __dirname,
      '../../../../../prisma/migrations/20260814145500_pf008_reviewed_knowledge_corrections/migration.sql',
    ),
    'utf8',
  );

  it('activates a correction only when the replacement becomes APPROVED', () => {
    expect(sql).toContain('BusinessKnowledgeRecord_reviewed_correction_activation');
    expect(sql).toContain('NEW."status" <> \'APPROVED\'');
    expect(sql).toContain('OLD."status" = \'APPROVED\'');
    expect(sql).toContain("NEW.\"sourceReference\" NOT LIKE 'PF008_CORRECTION_OF:%'");
  });

  it('requires the original source to be approved in the same tenant before archiving it', () => {
    expect(sql).toContain('AND "organizationId" = NEW."organizationId"');
    expect(sql).toContain("original_status <> 'APPROVED'");
    expect(sql).toContain("SET \"status\" = 'ARCHIVED'");
  });
});
