import { useState } from 'react';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { MatchedResourceDto, ResourceOfferResponseValue } from '../../../lib/api/needs';
import type { RecommendationSubject } from '../recommendations';
import { Button } from '../Button/Button';
import styles from './PlanCard.module.css';

/**
 * A stable key for a plan item independent of its discriminated shape —
 * `PlanItemDto` has no single `id` field of its own since a RECOMMENDATION
 * item and a CITY_RESOURCE item point at two different real records
 * (`AiRecommendation` vs a City Sheet entry), each keeping its own real
 * approval mechanism.
 */
export function planItemKey(item: PlanItemDto): string {
  return item.source === 'RECOMMENDATION'
    ? `recommendation:${item.recommendation!.id}`
    : `city-resource:${item.cityResource!.id}`;
}

export interface PlanCardProps {
  item: PlanItemDto;
  /** "Primary" or "Supporting" are coordinated-plan roles, never proof that items are mutually exclusive alternatives. */
  role: 'Primary' | 'Supporting';
  /** Resolved display copy for a RECOMMENDATION item's target. */
  subject: RecommendationSubject | null;
  /** The member's existing response to a CITY_RESOURCE item's offer. */
  offerResponse: ResourceOfferResponseValue | null;
  deciding: boolean;
  /** UI-007: false when current Responsibility recovery/terminal truth makes this historical plan non-actionable. */
  choiceEnabled?: boolean;
  /** Existing mutation path: recommendation approve or resource-offer accept. Must resolve only after authoritative mutation succeeds. */
  onApprove: () => Promise<void>;
  /** Existing mutation path: recommendation dismiss or resource-offer decline. Must resolve only after authoritative mutation succeeds. */
  onDismiss: () => Promise<void>;
}

interface ChoiceFact {
  label: string;
  value: string;
}

type ConfirmedRecommendationDecision = 'ACCEPTED' | 'DISMISSED';

function resourceFacts(resource: MatchedResourceDto): ChoiceFact[] {
  const facts: ChoiceFact[] = [];
  if (!resource.isTestFixture && resource.verificationStatus === 'VERIFIED') {
    facts.push({ label: 'Verification', value: 'Verified' });
  }
  if (resource.cost) facts.push({ label: 'Cost', value: resource.cost });
  if (resource.eligibilityRequirements) {
    facts.push({ label: 'Eligibility', value: resource.eligibilityRequirements });
  }
  if (resource.requiredDocuments.length > 0) {
    facts.push({ label: 'Documents', value: resource.requiredDocuments.join(', ') });
  }
  facts.push({
    label: 'Referral',
    value: resource.referralRequired ? 'Required' : 'Not required',
  });
  if (resource.serviceArea) facts.push({ label: 'Service area', value: resource.serviceArea });
  if (resource.hours) facts.push({ label: 'Hours', value: resource.hours });
  if (resource.phone) facts.push({ label: 'Phone', value: resource.phone });
  if (resource.accessibilityNotes) {
    facts.push({ label: 'Accessibility', value: resource.accessibilityNotes });
  }
  if (resource.languagesSupported.length > 0) {
    facts.push({ label: 'Languages', value: resource.languagesSupported.join(', ') });
  }
  facts.push({
    label: 'Emergency service',
    value: resource.isEmergencyService ? 'Yes' : 'No',
  });
  return facts;
}

function verificationCopy(resource: MatchedResourceDto): string | null {
  if (resource.isTestFixture) {
    return 'This is test fixture data, not a live verified resource.';
  }
  switch (resource.verificationStatus) {
    case 'VERIFIED':
      return null;
    case 'NEEDS_REVIEW':
      return 'Aureus has marked this resource as needing verification review.';
    case 'UNVERIFIED':
      return 'Aureus has not verified this resource yet.';
    case 'REJECTED':
      return 'Aureus did not accept this resource through verification, so I am not asking you to choose it.';
  }
}

const RECOMMENDATION_AUTHORITY =
  'This decision is yours. Choosing this records your approval in Aureus. It does not submit, sign, spend money, contact anyone, or expand Aureus authority.';

const RESOURCE_AUTHORITY =
  'This decision is yours. Choosing this records your response to this resource offer. It does not submit, sign, spend money, contact anyone, or expand Aureus authority.';

/**
 * UI-007 — Choosing. The coordinated-plan artifact already owns the real
 * recommendation/resource decision, so this component strengthens that same
 * surface instead of creating a second Choice store or approval path.
 *
 * Only pending, sufficiently sourced decisions render an active Choice region.
 * Accepted/dismissed/declined truth removes the controls. Recovery/terminal
 * Responsibility truth can also turn the plan into history-only presentation
 * without changing the underlying decision record. Unknown facts stay absent,
 * and Primary/Supporting roles are never rewritten as a hidden ranking or
 * mutually-exclusive comparison.
 *
 * CoordinatedPlanDto embeds a point-in-time RecommendationDto. The existing
 * approve/dismiss endpoint does not mutate that embedded object, so this card
 * remembers only a mutation that actually resolved successfully. This mirrors
 * the established first-run confirmed-decision pattern and prevents stale
 * PENDING controls without inventing a second durable decision record.
 */
export function PlanCard({
  item,
  role,
  subject,
  offerResponse,
  deciding,
  choiceEnabled = true,
  onApprove,
  onDismiss,
}: PlanCardProps) {
  const isRecommendation = item.source === 'RECOMMENDATION';
  const recommendation = isRecommendation ? item.recommendation! : null;
  const resource = isRecommendation ? null : item.cityResource!;
  const [confirmedRecommendationDecision, setConfirmedRecommendationDecision] =
    useState<ConfirmedRecommendationDecision | null>(null);

  const effectiveRecommendationStatus =
    confirmedRecommendationDecision ?? recommendation?.status ?? null;
  const recommendationPending = effectiveRecommendationStatus === 'PENDING';
  const resourcePending = resource !== null && offerResponse === 'PENDING';
  const resourceRejected = resource?.verificationStatus === 'REJECTED';
  const choiceReady = choiceEnabled && (isRecommendation
    ? recommendationPending && Boolean(subject)
    : resourcePending && !resourceRejected);

  const facts = resource ? resourceFacts(resource) : [];
  const uncertainty = resource ? verificationCopy(resource) : null;

  let decisionSummary: string | null = null;
  if (effectiveRecommendationStatus === 'ACCEPTED') {
    decisionSummary = 'You chose this recommendation.';
  } else if (effectiveRecommendationStatus === 'DISMISSED') {
    decisionSummary = 'You chose not to use this recommendation.';
  } else if (resource && offerResponse === 'ACCEPTED') {
    decisionSummary = 'You accepted this resource.';
  } else if (resource && offerResponse === 'DECLINED') {
    decisionSummary = 'You declined this resource.';
  } else if (!choiceEnabled && (recommendationPending || resourcePending)) {
    decisionSummary = 'This earlier plan item is not an active choice while the current work state takes precedence.';
  } else if (isRecommendation && recommendationPending && !subject) {
    decisionSummary = 'Decision details are not available yet. I will not ask you to choose without the item details.';
  } else if (resource && offerResponse === null) {
    decisionSummary = 'This resource offer is not ready for a decision yet.';
  } else if (resourceRejected) {
    decisionSummary = uncertainty;
  }

  const approve = async () => {
    try {
      await onApprove();
      if (isRecommendation) setConfirmedRecommendationDecision('ACCEPTED');
    } catch {
      // The existing mutation owner reports/retains its own error truth. UI-007
      // only refuses to claim the decision changed when that mutation failed.
    }
  };

  const dismiss = async () => {
    try {
      await onDismiss();
      if (isRecommendation) setConfirmedRecommendationDecision('DISMISSED');
    } catch {
      // Same fail-closed rule as approval: no successful mutation, no new truth.
    }
  };

  return (
    <div className={styles.item}>
      <div className={styles.roleRow}>
        <span className={role === 'Primary' ? styles.rolePrimary : styles.roleSupporting}>{role}</span>
        <span className={styles.categoryLabel}>{item.categoryLabel}</span>
      </div>

      <div className={styles.summary}>
        <h3 className={styles.title}>
          {isRecommendation ? (subject?.title ?? item.categoryLabel) : resource!.organizationName}
        </h3>
        {isRecommendation ? (
          <>
            {subject?.description ? <p className={styles.description}>{subject.description}</p> : null}
            <p className={styles.rationale}>
              <span className={styles.factLabel}>Why this is here</span>
              {recommendation!.rationale}
            </p>
          </>
        ) : (
          <p className={styles.description}>{resource!.description}</p>
        )}
      </div>

      {choiceReady ? (
        <section className={styles.choice} aria-label="Choose what happens next">
          <p className={styles.choiceLabel}>Choose what happens next</p>

          {facts.length > 0 ? (
            <dl className={styles.choiceFacts}>
              {facts.map((fact) => (
                <div className={styles.choiceFact} key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {uncertainty ? (
            <p className={styles.uncertainty}>
              <span className={styles.factLabel}>What I am not assuming</span>
              {uncertainty}
            </p>
          ) : null}

          <p className={styles.authority}>
            <span className={styles.factLabel}>Your authority</span>
            {isRecommendation ? RECOMMENDATION_AUTHORITY : RESOURCE_AUTHORITY}
          </p>

          <div className={styles.actions}>
            <Button onClick={() => void approve()} disabled={deciding}>
              {deciding ? 'Saving…' : isRecommendation ? 'Choose this' : 'Use this resource'}
            </Button>
            <Button variant="secondary" onClick={() => void dismiss()} disabled={deciding}>
              {isRecommendation ? 'Not this' : 'Not this resource'}
            </Button>
          </div>
        </section>
      ) : decisionSummary ? (
        <p className={styles.decisionSummary}>{decisionSummary}</p>
      ) : null}
    </div>
  );
}
