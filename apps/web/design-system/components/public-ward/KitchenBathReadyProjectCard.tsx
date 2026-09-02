'use client';

import type { KitchenBathReadyProject } from '../../../lib/api/kitchen-bath';
import styles from './KitchenBathReadyProjectCard.module.css';

const barrierLabel: Record<
  KitchenBathReadyProject['transactionBarriers'][number]['key'],
  string
> = {
  DESIRE: 'What you want',
  FIT: 'Site fit & feasibility',
  PRICE: 'Final price',
  FUNDING: 'Funding',
  AVAILABILITY: 'Business availability',
  TIMING: 'Desired timing',
  KNOWLEDGE_UNCERTAINTY: 'Project uncertainty',
  TRUST: 'Trust',
  DECISION_AUTHORITY: 'Decision authority',
  ADMINISTRATIVE_FRICTION: 'Administrative requirements',
  ALTERNATIVES: 'Alternatives',
};

const statusLabel: Record<
  KitchenBathReadyProject['transactionBarriers'][number]['status'],
  string
> = {
  CUSTOMER_STATED: 'You told us',
  OPEN: 'Still open',
  EXPERT_REQUIRED: 'Expert needed',
  BUSINESS_REQUIRED: 'Business confirmation needed',
  NOT_ASSESSED: 'Not assessed yet',
};

const priorityLabel: Record<string, string> = {
  LOOK_AND_FEEL: 'Look & feel',
  FUNCTION_AND_LAYOUT: 'Function & layout',
  DURABILITY: 'Durability',
  BUDGET_CONTROL: 'Budget control',
  TIMING: 'Timing',
  ACCESSIBILITY: 'Accessibility',
  LOW_MAINTENANCE: 'Low maintenance',
  RESALE_VALUE: 'Resale value',
  ENERGY_EFFICIENCY: 'Energy efficiency',
  OTHER: 'Other',
};

function readable(value: string | null): string {
  return value ? value.replaceAll('_', ' ').toLowerCase() : 'Not provided';
}

export function KitchenBathReadyProjectCard({
  project,
  audience = 'customer',
}: {
  project: KitchenBathReadyProject;
  audience?: 'customer' | 'business';
}) {
  const complete = project.readinessStatus === 'READY_FOR_EXPERT_REVIEW';

  return (
    <section
      className={styles.card}
      aria-label="Kitchen and Bath Ready Project"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ready Project</p>
          <h3>
            {complete
              ? audience === 'customer'
                ? 'Aureus organized your project for expert review'
                : 'Aureus distilled the project for expert review'
              : 'Aureus found incomplete project source data'}
          </h3>
        </div>
        <span className={styles.state}>
          {complete ? 'Ready for expert review' : 'Source incomplete'}
        </span>
      </header>

      <div className={styles.summaryGrid}>
        <div>
          <span>Project</span>
          <strong>{readable(project.customerIntent.projectType)}</strong>
        </div>
        <div>
          <span>Rooms</span>
          <strong>
            {project.customerIntent.rooms.length
              ? project.customerIntent.rooms.join(', ')
              : 'Not provided'}
          </strong>
        </div>
        <div>
          <span>Desired timing</span>
          <strong>{readable(project.constraints.desiredTiming)}</strong>
        </div>
        <div>
          <span>Budget context</span>
          <strong>{readable(project.constraints.budgetRange)}</strong>
        </div>
      </div>

      {project.customerIntent.scope ? (
        <div className={styles.section}>
          <h4>What the customer wants to change</h4>
          <p>{project.customerIntent.scope}</p>
        </div>
      ) : null}

      {project.customerIntent.priorities.length ||
      project.customerIntent.mustHaves ||
      project.customerIntent.concerns ? (
        <div className={styles.section}>
          <h4>What matters</h4>
          {project.customerIntent.priorities.length ? (
            <div className={styles.chips} aria-label="Customer priorities">
              {project.customerIntent.priorities.map((priority) => (
                <span key={priority}>
                  {priorityLabel[priority] ?? readable(priority)}
                </span>
              ))}
            </div>
          ) : null}
          {project.customerIntent.mustHaves ? (
            <p>
              <strong>Must-haves:</strong> {project.customerIntent.mustHaves}
            </p>
          ) : null}
          {project.customerIntent.concerns ? (
            <p>
              <strong>Concerns / avoid:</strong>{' '}
              {project.customerIntent.concerns}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.section}>
        <h4>Transaction barriers</h4>
        <div className={styles.barriers}>
          {project.transactionBarriers.map((barrier) => (
            <div key={barrier.key} className={styles.barrier}>
              <div>
                <strong>{barrierLabel[barrier.key]}</strong>
                <span>{statusLabel[barrier.status]}</span>
              </div>
              <p>{barrier.basis}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h4>What still needs a human expert</h4>
        <ul>
          {project.expertValidationRequired.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className={styles.boundary}>
        <strong>This is not a quote or appointment.</strong>
        <p>
          Ready for expert review means Aureus has organized the
          customer-supplied project context and made the remaining uncertainty
          visible. It does not mean the site, price, schedule, permit needs, or
          final scope have been verified.
        </p>
      </div>

      {project.missingRequiredSource.length ? (
        <p className={styles.warning} role="alert">
          Missing retained source: {project.missingRequiredSource.join(', ')}.
          Aureus did not guess the missing facts.
        </p>
      ) : null}
    </section>
  );
}
