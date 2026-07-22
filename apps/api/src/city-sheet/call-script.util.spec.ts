import { CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, LaunchAreaScope } from '@prisma/client';
import type { CitySheetEntry } from '@prisma/client';
import { buildCallScript } from './call-script.util';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeEntry = (o: Partial<CitySheetEntry> = {}): CitySheetEntry => ({
  id: 'cs-uuid', sequenceNumber: 1, citySheetRef: 'AUR-CS-000001',
  organizationName: 'Chester County Crisis Line', category: CitySheetCategory.CRISIS_LINE,
  description: 'desc', address: null, serviceArea: 'Chester County only',
  launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
  phone: '610-280-3270', website: null, hours: '24/7',
  eligibilityRequirements: null, languagesSupported: [], accessibilityNotes: null,
  cost: null, requiredDocuments: [], referralRequired: false, isEmergencyService: true,
  verificationStatus: CitySheetVerificationStatus.UNVERIFIED, verificationConfidence: null,
  lastVerifiedAt: null, verifiedById: null, verificationNotes: null, rejectionReason: null,
  nextReviewDueAt: null, sourceNotes: null,
  status: CitySheetEntryStatus.ACTIVE, createdById: 'steward-001',
  createdAt: NOW, updatedAt: NOW, ...o,
});

describe('buildCallScript', () => {
  it('includes the organization name, ref, and stored facts', () => {
    const script = buildCallScript(makeEntry(), []);
    expect(script).toContain('Chester County Crisis Line');
    expect(script).toContain('AUR-CS-000001');
    expect(script).toContain('610-280-3270');
    expect(script).toContain('24/7');
  });

  it('lists every checklist item as a fillable line', () => {
    const script = buildCallScript(makeEntry(), [
      { id: 'i1', label: 'Phone number reached and currently in service' },
      { id: 'i2', label: 'Confirm 24/7 availability' },
    ]);
    expect(script).toContain('[ ] Phone number reached and currently in service');
    expect(script).toContain('[ ] Confirm 24/7 availability');
  });

  it('references verify/reject endpoints by the entry id', () => {
    const script = buildCallScript(makeEntry({ id: 'entry-42' }), []);
    expect(script).toContain('/city-sheet/entry-42/verify');
    expect(script).toContain('/city-sheet/entry-42/reject');
  });

  it('never fabricates a phone/address when none is on file', () => {
    const script = buildCallScript(makeEntry({ phone: null, address: null }), []);
    expect(script).toContain('Phone on file: none on file');
    expect(script).toContain('Address on file: none on file');
  });

  it('states that only a Human Steward or Founder may submit the outcome', () => {
    const script = buildCallScript(makeEntry(), []);
    expect(script.toLowerCase()).toContain('human steward');
  });
});
