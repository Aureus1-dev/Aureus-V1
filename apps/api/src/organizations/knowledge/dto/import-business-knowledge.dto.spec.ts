import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessKnowledgeType } from '@prisma/client';
import { ImportBusinessKnowledgeDto } from './import-business-knowledge.dto';

const valid = {
  title: 'Installation services',
  summary: 'What the company installs',
  content: 'We install cabinets, counters, fixtures, and tile.',
  knowledgeType: BusinessKnowledgeType.SERVICE,
  sourceReference: 'Owner-approved services list, August 2026',
  freshnessIntervalDays: 90,
  fileName: 'services.md',
  mimeType: 'text/markdown',
  acknowledgeUnverifiedSource: true,
};

describe('ImportBusinessKnowledgeDto safety boundary', () => {
  it.each([
    ['missing source acknowledgement', { ...valid, acknowledgeUnverifiedSource: false }],
    ['executable HTML', { ...valid, mimeType: 'text/html' }],
    ['binary document', { ...valid, mimeType: 'application/pdf' }],
    ['unbounded freshness', { ...valid, freshnessIntervalDays: 0 }],
    ['source without provenance', { ...valid, sourceReference: '' }],
  ])('rejects %s', async (_label, input) => {
    const dto = plainToInstance(ImportBusinessKnowledgeDto, input);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts only acknowledged plain text or Markdown source material', async () => {
    const dto = plainToInstance(ImportBusinessKnowledgeDto, valid);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
