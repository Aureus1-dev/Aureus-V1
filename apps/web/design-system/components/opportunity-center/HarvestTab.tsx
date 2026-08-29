'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../../state';
import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { LoadingState } from '../LoadingState/LoadingState';
import * as harvestApi from '../../../lib/api/harvest';
import type {
  HarvestCandidateDto,
  HarvestPlanDto,
  HarvestPlanItemDto,
} from '../../../lib/api/harvest';
import styles from './HarvestTab.module.css';

const TAX_YEAR = 2026;
const JURISDICTION_STATE = 'PA';

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function dollarsToCents(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function terminalItem(status: HarvestPlanItemDto['status']): boolean {
  return ['WITHDRAWN', 'SKIPPED', 'STOPPED'].includes(status);
}

export function HarvestTab() {
  const { session } = useSession();
  const accessToken = session.accessToken;
  const [plan, setPlan] = useState<HarvestPlanDto | null>(null);
  const [candidates, setCandidates] = useState<HarvestCandidateDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!accessToken || session.isGuest) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);

    void Promise.all([
      harvestApi.getHarvestPlan(accessToken, TAX_YEAR),
      harvestApi.listHarvestCandidates(
        accessToken,
        JURISDICTION_STATE,
        'US',
      ),
    ])
      .then(([currentPlan, currentCandidates]) => {
        if (cancelled) return;
        setPlan(currentPlan);
        setCandidates(currentCandidates);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, session.isGuest]);

  if (session.isGuest) {
    return (
      <div className={styles.notice}>
        <h2>Annual Harvest</h2>
        <p>
          Claim your account before creating an annual plan. Browsing help
          remains available without doing this.
        </p>
      </div>
    );
  }

  if (!accessToken || !session.isAuthenticated) {
    return (
      <div className={styles.notice}>
        <h2>Annual Harvest</h2>
        <p>Sign in before creating an annual harvest plan.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState label="Checking your annual harvest plan" />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Annual Harvest is unavailable right now"
        description="Nothing will start while Aureus cannot verify the current plan and offer data."
      />
    );
  }

  if (plan) {
    return (
      <HarvestPlanView
        accessToken={accessToken}
        plan={plan}
        onChange={setPlan}
        onReset={() => setPlan(null)}
      />
    );
  }

  return (
    <HarvestSetup
      accessToken={accessToken}
      candidates={candidates}
      onCreated={setPlan}
    />
  );
}

function HarvestSetup({
  accessToken,
  candidates,
  onCreated,
}: {
  accessToken: string;
  candidates: HarvestCandidateDto[];
  onCreated: (plan: HarvestPlanDto) => void;
}) {
  const [filingStatus, setFilingStatus] =
    useState<harvestApi.CreateHarvestPlanInput['filingStatus']>('SINGLE');
  const [benefitImpactStatus, setBenefitImpactStatus] =
    useState<harvestApi.CreateHarvestPlanInput['benefitImpactStatus']>(
      'UNKNOWN',
    );
  const [memberAge, setMemberAge] = useState('');
  const [income, setIncome] = useState('');
  const [itemized, setItemized] = useState('0');
  const [bankroll, setBankroll] = useState('');
  const [lossLimit, setLossLimit] = useState('');
  const [hours, setHours] = useState('');
  const [taxReview, setTaxReview] = useState(false);
  const [ageAttested, setAgeAttested] = useState(false);
  const [eligibilityReviewed, setEligibilityReviewed] = useState(false);
  const [legalParticipationAttested, setLegalParticipationAttested] =
    useState(false);
  const [stopAccepted, setStopAccepted] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  function toggleExcluded(id: string) {
    setExcluded((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(false);
    setIsSubmitting(true);

    try {
      const created = await harvestApi.createHarvestPlan(accessToken, {
        taxYear: TAX_YEAR,
        jurisdictionState: JURISDICTION_STATE,
        jurisdictionCountry: 'US',
        filingStatus,
        otherTaxableIncomeCents: dollarsToCents(income),
        itemizedDeductionsBeforeGamblingCents:
          dollarsToCents(itemized),
        benefitImpactStatus,
        requiresTaxProfessionalReview: taxReview,
        memberAgeYears: Number(memberAge),
        attestsAgeAccuracy: ageAttested,
        reviewedOfferEligibility: eligibilityReviewed,
        attestsLegalParticipation: legalParticipationAttested,
        excludedOfferProfileIds: excluded,
        bankrollLimitCents: dollarsToCents(bankroll),
        projectedLossLimitCents: dollarsToCents(lossLimit),
        timeLimitMinutes: Math.round(Number(hours) * 60),
        acceptsStopRule: stopAccepted,
      });
      onCreated(created);
    } catch {
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className={styles.notice}>
        <h2>{TAX_YEAR} Annual Harvest</h2>
        <p>
          There are no fresh, regulated, reviewed offers available right now.
          Aureus will not substitute stale terms or guess.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.intro}>
        <h2>{TAX_YEAR} Annual Harvest</h2>
        <p>
          Aureus will only sequence fresh, regulated offers that remain
          positive after the current tax estimate and the limits you set.
          It never places a wager for you.
        </p>
        <p className={styles.helper}>
          Annual Harvest is optional. Do not use it if you are self-excluded
          or do not want gambling promotions. Pennsylvania responsible-gaming
          and self-exclusion resources are available at{' '}
          <a
            href="https://responsibleplay.pa.gov/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Responsible Play PA
          </a>.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Eligibility first</legend>
        <label className={styles.field}>
          <span>Your age today</span>
          <input
            required
            type="number"
            min={18}
            max={120}
            inputMode="numeric"
            value={memberAge}
            onChange={(event) => setMemberAge(event.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={ageAttested}
            onChange={(event) => setAgeAttested(event.target.checked)}
          />
          <span>I confirm that age is accurate.</span>
        </label>

        <p className={styles.helper}>
          Mark every offer you have already used or otherwise cannot claim as
          a new customer.
        </p>
        <div className={styles.candidates}>
          {candidates.map((candidate) => (
            <label className={styles.candidate} key={candidate.offerProfileId}>
              <input
                type="checkbox"
                checked={excluded.includes(candidate.offerProfileId)}
                onChange={() => toggleExcluded(candidate.offerProfileId)}
              />
              <span>
                <strong>{candidate.title}</strong>
                <small>
                  {candidate.provider} · {candidate.minAge}+ · terms verified{' '}
                  {new Date(candidate.termsVerifiedAt).toLocaleDateString()}
                </small>
                <small>
                  Reviewed advertised value: {money(candidate.advertisedValueCents)}
                </small>
              </span>
            </label>
          ))}
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={eligibilityReviewed}
            onChange={(event) =>
              setEligibilityReviewed(event.target.checked)
            }
          />
          <span>
            I reviewed this list and marked the offers I already used or am
            otherwise ineligible for.
          </span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={legalParticipationAttested}
            onChange={(event) =>
              setLegalParticipationAttested(event.target.checked)
            }
          />
          <span>
            I am currently legally permitted to use Pennsylvania gaming
            promotions and I am not self-excluded from the relevant gaming
            product.
          </span>
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Tax and benefit gates</legend>
        <label className={styles.field}>
          <span>2026 filing status</span>
          <select
            value={filingStatus}
            onChange={(event) =>
              setFilingStatus(
                event.target.value as typeof filingStatus,
              )
            }
          >
            <option value="SINGLE">Single</option>
            <option value="MARRIED_FILING_JOINTLY">
              Married filing jointly
            </option>
            <option value="HEAD_OF_HOUSEHOLD">Head of household</option>
            <option value="MARRIED_FILING_SEPARATELY">
              Married filing separately
            </option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Estimated other taxable income for 2026 ($)</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={income}
            onChange={(event) => setIncome(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Itemized deductions before gambling ($)</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={itemized}
            onChange={(event) => setItemized(event.target.value)}
          />
        </label>
        <p className={styles.helper}>
          Gambling winnings can affect eligibility or required reporting for
          means-tested programs such as SNAP, Medicaid, LIHEAP, housing support,
          or other income-based assistance. If you receive or may qualify for
          any such program and have not checked its specific rules, choose
          “I do not know yet.” Aureus will block the plan rather than guess.
        </p>
        <label className={styles.field}>
          <span>Means-tested benefit impact</span>
          <select
            value={benefitImpactStatus}
            onChange={(event) =>
              setBenefitImpactStatus(
                event.target.value as typeof benefitImpactStatus,
              )
            }
          >
            <option value="UNKNOWN">I do not know yet — block the plan</option>
            <option value="NOT_APPLICABLE">
              I do not receive or rely on means-tested benefits
            </option>
            <option value="CLEARED">
              I reviewed my specific program rules and cleared this
            </option>
          </select>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={taxReview}
            onChange={(event) => setTaxReview(event.target.checked)}
          />
          <span>
            My tax situation needs professional review before I use a gambling
            promotion.
          </span>
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Your hard limits</legend>
        <label className={styles.field}>
          <span>Maximum bankroll tied up at once ($)</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={bankroll}
            onChange={(event) => setBankroll(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Maximum projected cash loss for the year ($)</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={lossLimit}
            onChange={(event) => setLossLimit(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Maximum time for the year (hours)</span>
          <input
            required
            type="number"
            min={0.25}
            step="0.25"
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={stopAccepted}
            onChange={(event) => setStopAccepted(event.target.checked)}
          />
          <span>
            I understand: when Aureus says stop, I stop. A stopped plan cannot
            be resumed.
          </span>
        </label>
      </fieldset>

      {submitError ? (
        <ErrorState
          title="The plan was not created"
          description="A required safety, eligibility, tax, or freshness gate did not pass. Nothing was started."
        />
      ) : null}

      <Button
        type="submit"
        disabled={
          isSubmitting ||
          !ageAttested ||
          !eligibilityReviewed ||
          !legalParticipationAttested ||
          !stopAccepted
        }
      >
        {isSubmitting ? 'Building plan…' : 'Build my annual plan'}
      </Button>
    </form>
  );
}

function HarvestPlanView({
  accessToken,
  plan,
  onChange,
  onReset,
}: {
  accessToken: string;
  plan: HarvestPlanDto;
  onChange: (plan: HarvestPlanDto) => void;
  onReset: () => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [remaining, setRemaining] = useState('');
  const [evidence, setEvidence] = useState('');
  const [amount, setAmount] = useState('');

  const current = useMemo(
    () => plan.items.find((item) => !terminalItem(item.status)) ?? null,
    [plan.items],
  );
  const settlementAfterStop =
    plan.status === 'STOPPED' &&
    current !== null &&
    (current.status === 'REQUIREMENT_MET' ||
      current.status === 'WITHDRAWAL_REQUESTED');

  async function run(action: () => Promise<HarvestPlanDto>) {
    setIsBusy(true);
    setActionError(false);
    try {
      onChange(await action());
    } catch {
      setActionError(true);
    } finally {
      setIsBusy(false);
    }
  }

  async function closeAndReset(reason: string) {
    setIsBusy(true);
    setActionError(false);
    try {
      await harvestApi.stopHarvestPlan(accessToken, plan.id, reason);
      onReset();
    } catch {
      setActionError(true);
    } finally {
      setIsBusy(false);
    }
  }

  if (plan.status === 'REVIEW_REQUIRED') {
    return (
      <section className={styles.plan}>
        <h2>{plan.taxYear} Annual Harvest</h2>
        <div className={styles.stopNotice} role="alert">
          <strong>Do not start.</strong>
          {plan.blockReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={() =>
            void closeAndReset(
              'Member closed a review-required plan to build a fresh plan.',
            )
          }
        >
          Close this plan and start over
        </Button>
        {actionError ? (
          <ErrorState
            title="The plan was not closed"
            description="Nothing changed. You can try again after checking your connection."
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className={styles.plan}>
      <div className={styles.intro}>
        <h2>{plan.taxYear} Annual Harvest</h2>
        <p>
          Projected after-tax value: <strong>{money(plan.projectedNetValueCents)}</strong>
        </p>
        <p className={styles.helper}>
          This is a planning estimate from the reviewed 2026 federal/PA rule
          pack, not a tax-return guarantee. It does not calculate every credit
          or phase-out (including possible EITC/CTC or benefit effects). If
          those may apply, stop and use professional/program-specific review.
        </p>
      </div>

      <dl className={styles.metrics}>
        <div>
          <dt>Tax reserve</dt>
          <dd>{money(plan.recommendedTaxReserveCents)}</dd>
        </div>
        <div>
          <dt>Max bankroll</dt>
          <dd>{money(plan.maxBankrollRequiredCents)}</dd>
        </div>
        <div>
          <dt>Estimated time</dt>
          <dd>{Math.ceil(plan.projectedMinutes / 60)} hr</dd>
        </div>
        <div>
          <dt>Withdrawn</dt>
          <dd>{money(plan.withdrawnValueCents)}</dd>
        </div>
      </dl>

      {plan.status === 'STOPPED' ? (
        <div className={styles.stopNotice} role="alert">
          <strong>Stopped. Do not continue wagering.</strong>
          {plan.stopReason ? <p>{plan.stopReason}</p> : null}
          <p>
            Do not keep playing solely to preserve a bonus. If you have cash
            available at the operator, withdraw it when the operator permits;
            promotional value may be forfeited.
          </p>
        </div>
      ) : null}

      {plan.status === 'COMPLETED' ? (
        <div className={styles.notice}>
          <strong>This harvest cycle is complete.</strong>
          <p>No additional offer is queued in this cycle.</p>
        </div>
      ) : null}

      {(plan.status === 'STOPPED' && !settlementAfterStop) ||
      plan.status === 'COMPLETED' ? (
        <Button type="button" variant="secondary" onClick={onReset}>
          Check for a fresh plan
        </Button>
      ) : null}

      {current &&
      (plan.status === 'READY' ||
        plan.status === 'ACTIVE' ||
        settlementAfterStop) ? (
        <HarvestCurrentItem
          item={current}
          isBusy={isBusy}
          remaining={remaining}
          evidence={evidence}
          amount={amount}
          setRemaining={setRemaining}
          setEvidence={setEvidence}
          setAmount={setAmount}
          onStart={() =>
            run(() =>
              harvestApi.startHarvestItem(
                accessToken,
                plan.id,
                current.id,
              ),
            )
          }
          onProgress={() =>
            run(() =>
              harvestApi.reportHarvestProgress(
                accessToken,
                plan.id,
                current.id,
                dollarsToCents(remaining),
                evidence.trim() || undefined,
              ),
            )
          }
          onComplete={() =>
            run(() =>
              harvestApi.confirmHarvestRequirement(
                accessToken,
                plan.id,
                current.id,
              ),
            )
          }
          onRequestWithdrawal={() =>
            run(() =>
              harvestApi.requestHarvestWithdrawal(
                accessToken,
                plan.id,
                current.id,
                dollarsToCents(amount),
              ),
            )
          }
          onConfirmWithdrawal={() =>
            run(() =>
              harvestApi.confirmHarvestWithdrawal(
                accessToken,
                plan.id,
                current.id,
                dollarsToCents(amount),
              ),
            )
          }
          onSkip={() =>
            run(() =>
              harvestApi.skipHarvestItem(
                accessToken,
                plan.id,
                current.id,
                'Member chose to preserve or decline this offer.',
              ),
            )
          }
        />
      ) : null}

      {actionError ? (
        <ErrorState
          title="That step did not pass"
          description="Aureus kept the current state unchanged. Recheck the operator progress or the required sequence before trying again."
        />
      ) : null}

      {!['STOPPED', 'COMPLETED', 'CANCELLED'].includes(plan.status) ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={() =>
            void run(() =>
              harvestApi.stopHarvestPlan(
                accessToken,
                plan.id,
                'Member stopped the annual harvest plan.',
              ),
            )
          }
        >
          Stop the plan
        </Button>
      ) : null}
    </section>
  );
}

function HarvestCurrentItem({
  item,
  isBusy,
  remaining,
  evidence,
  amount,
  setRemaining,
  setEvidence,
  setAmount,
  onStart,
  onProgress,
  onComplete,
  onRequestWithdrawal,
  onConfirmWithdrawal,
  onSkip,
}: {
  item: HarvestPlanItemDto;
  isBusy: boolean;
  remaining: string;
  evidence: string;
  amount: string;
  setRemaining: (value: string) => void;
  setEvidence: (value: string) => void;
  setAmount: (value: string) => void;
  onStart: () => void;
  onProgress: () => void;
  onComplete: () => void;
  onRequestWithdrawal: () => void;
  onConfirmWithdrawal: () => void;
  onSkip: () => void;
}) {
  const snapshot = item.sourceSnapshot;
  const firstInstruction =
    snapshot.executionInstructions[0] ??
    'Open the verified offer and confirm the displayed terms still match Aureus before doing anything.';

  const instruction =
    item.status === 'QUEUED'
      ? firstInstruction
      : item.status === 'IN_PROGRESS'
        ? 'Use the operator progress meter. Record its remaining requirement here; do not exceed the reviewed requirement.'
        : item.status === 'REQUIREMENT_MET'
          ? 'Requirement complete. Stop playing now and request withdrawal.'
          : item.status === 'WITHDRAWAL_REQUESTED'
            ? 'Do not continue playing. Confirm the amount only after the withdrawal reaches you.'
            : 'Stop.';

  return (
    <article className={styles.current}>
      <p className={styles.eyebrow}>Offer {item.position}</p>
      <h3>{snapshot.title}</h3>
      <p>{snapshot.provider}</p>
      <p>
        Expected after-tax value:{' '}
        <strong>{money(item.projectedNetAfterTaxCents)}</strong>
      </p>
      <div className={styles.instruction}>
        <strong>Do this now</strong>
        <p>{instruction}</p>
      </div>

      {snapshot.riskNotes.length > 0 ? (
        <p className={styles.helper}>{snapshot.riskNotes[0]}</p>
      ) : null}

      <div className={styles.links}>
        {snapshot.applicationUrl ? (
          <a
            href={snapshot.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open verified offer
          </a>
        ) : null}
        <a
          href={snapshot.termsSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Offer terms
        </a>
        <a
          href={snapshot.licenseSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          License source
        </a>
      </div>

      {item.status === 'QUEUED' ? (
        <Button type="button" disabled={isBusy} onClick={onStart}>
          Start this offer
        </Button>
      ) : null}

      {item.status === 'IN_PROGRESS' ? (
        <div className={styles.actionPanel}>
          <label className={styles.field}>
            <span>Operator says wagering remaining ($)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={remaining}
              onChange={(event) => setRemaining(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Evidence reference (optional)</span>
            <input
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Statement date, screenshot name, or operator reference"
            />
          </label>
          <Button
            type="button"
            disabled={isBusy || remaining === ''}
            onClick={onProgress}
          >
            Save operator progress
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy || item.operatorReportedRemainingCents !== 0}
            onClick={onComplete}
          >
            Operator confirms complete
          </Button>
        </div>
      ) : null}

      {item.status === 'REQUIREMENT_MET' ? (
        <div className={styles.actionPanel}>
          <label className={styles.field}>
            <span>Amount to withdraw ($)</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={isBusy || amount === ''}
            onClick={onRequestWithdrawal}
          >
            Request withdrawal
          </Button>
        </div>
      ) : null}

      {item.status === 'WITHDRAWAL_REQUESTED' ? (
        <div className={styles.actionPanel}>
          <label className={styles.field}>
            <span>Amount received ($)</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <Button
            type="button"
            disabled={isBusy || amount === ''}
            onClick={onConfirmWithdrawal}
          >
            Confirm money received
          </Button>
        </div>
      ) : null}

      {['QUEUED', 'IN_PROGRESS'].includes(item.status) ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={onSkip}
        >
          Skip this offer
        </Button>
      ) : null}
    </article>
  );
}
