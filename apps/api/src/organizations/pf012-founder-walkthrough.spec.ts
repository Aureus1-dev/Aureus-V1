import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function rootFile(path: string): string {
  return readFileSync(resolve(process.cwd(), '../..', path), 'utf8');
}

const REQUIRED_STEPS = [
  'BUSINESS_ONBOARDING',
  'KNOWLEDGE_SETUP_AND_APPROVAL',
  'PUBLIC_WARD_QUESTION',
  'WARD_CLARIFICATION',
  'CONSENTED_LEAD',
  'BUSINESS_NOTIFICATION',
  'HUMAN_ACCEPTANCE_AND_HANDOFF',
  'OUTCOME_RECORDING',
  'CORRECTION_AND_DELETION',
  'FAILURE_MODE_AND_PROVIDER_OUTAGE_DRILL',
];

describe('PF-012 Founder walkthrough gate', () => {
  it('pins one exact release lineage and requires the full ten-step run on mobile and desktop', () => {
    const manifest = JSON.parse(
      rootFile('docs/product-first/manifests/PF-012-founder-walkthrough-manifest.json'),
    ) as any;

    expect(manifest.schemaVersion).toBe('pf012-founder-walkthrough-v1');
    expect(manifest.repositories['Aureus-V1'].requiredParent).toBe(
      'c2aef81aad3f7b640c009acf6e10d4e315d94db9',
    );
    expect(manifest.repositories['Aureus-Foundry'].releaseCommit).toBe(
      'e6c0a4558145c6f00d5e7734be95af08daf8241a',
    );
    expect(manifest.repositories['Aureus-Library'].releaseCommit).toBe(
      'e217284d0b9d4e8e9cbca119c8257d202a34a5c7',
    );
    expect(manifest.deployment.sameDeploymentRequiredForAllSteps).toBe(true);
    expect(manifest.deviceClasses).toEqual(['MOBILE', 'DESKTOP']);
    expect(manifest.requiredSteps).toEqual(REQUIRED_STEPS);
    expect(manifest.releaseRules.everyStepMustPassOnBothDeviceClasses).toBe(true);
    expect(manifest.releaseRules.externalBusinessAllowedBeforeFounderSignoff).toBe(false);
  });

  it('keeps phone/SMS truthfully separate from the web-pilot signoff', () => {
    const manifest = JSON.parse(
      rootFile('docs/product-first/manifests/PF-012-founder-walkthrough-manifest.json'),
    ) as any;
    const docs = rootFile('docs/product-first/PF-012-FOUNDER-WALKTHROUGH.md');

    expect(manifest.releaseRules.phoneSmsMayBeAdvertisedWithoutProviderDrill).toBe(false);
    expect(manifest.releaseRules.webPilotMayPassWhilePhoneSmsIsExplicitlyNotConfigured).toBe(true);
    expect(docs).toContain('PHONE_SMS = NOT_CONFIGURED');
    expect(docs).toContain('inbound-call → disclosure → SMS continuation');
  });

  it('ships a fail-closed evidence receipt that cannot look pre-approved', () => {
    const receipt = JSON.parse(
      rootFile('docs/product-first/manifests/PF-012-founder-walkthrough-receipt.template.json'),
    ) as any;

    expect(receipt.releaseDecision).toBe('NOT_RUN');
    expect(receipt.founderSignoff.signed).toBe(false);
    expect(receipt.runs.MOBILE.steps).toEqual([]);
    expect(receipt.runs.DESKTOP.steps).toEqual([]);
    expect(receipt.operabilityEvidence.environmentVerified).toBe(false);
    expect(receipt.operabilityEvidence.realEmailCyclePassed).toBe(false);
    expect(receipt.operabilityEvidence.restoreDrillPassed).toBe(false);
    expect(receipt.operabilityEvidence.alertReceiptPassed).toBe(false);
  });

  it('requires outage, tenant-boundary, deletion, and accessibility evidence in the written procedure', () => {
    const docs = rootFile('docs/product-first/PF-012-FOUNDER-WALKTHROUGH.md');
    for (const phrase of [
      'another tenant cannot',
      'draft/rejected/stale material cannot ground',
      'visitor handoff deletion',
      'unavailable/failed AI provider path',
      'fails closed',
      'keyboard/focus on desktop',
      'zoom/reflow and touch targets on mobile',
      'application-code deployment after the walkthrough invalidates the receipt',
    ]) {
      expect(docs).toContain(phrase);
    }
  });
});
