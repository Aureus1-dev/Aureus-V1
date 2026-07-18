'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useFounder } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './FounderDashboard.module.css';

/**
 * The Founder Operating System's landing surface (PR-003) — institutional
 * health at a glance, with each tile a doorway into the panel that goes
 * deeper (AI Operational Controls, Review Queue, Stewardship Oversight,
 * User & Role Management, Announcements, Governance monitoring). This
 * component owns no data of its own — it reads `FounderContext`'s metrics
 * slice exactly as `HomeDashboard` reads `JourneyContext` (FPB-010 §7).
 */
export function FounderDashboard() {
  const { state, loadMetrics } = useFounder();

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (state.isLoadingMetrics && !state.metrics) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing institutional health metrics" />
      </div>
    );
  }

  if (state.error && !state.metrics) {
    return (
      <ErrorState
        title="Institutional health metrics couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void loadMetrics()}>Try again</Button> : undefined}
      />
    );
  }

  if (!state.metrics) {
    return null;
  }

  const { metrics } = state;

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Founder Operating System</h1>
      <p className={styles.intro}>Institutional health, at a glance — and the tools to steward it.</p>

      <div className={styles.grid}>
        <Link href="/founder/users" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>Members</span>
            <span className={styles.tileValue}>{metrics.totalUsers}</span>
            <ul className={styles.tileBreakdown}>
              {metrics.usersByStatus.map((entry) => (
                <li key={entry.status}>
                  {entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}: {entry.count}
                </li>
              ))}
            </ul>
          </Card>
        </Link>

        <Link href="/founder/review" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>Pending review</span>
            <span className={styles.tileValue}>{metrics.pendingVerification.total}</span>
            <ul className={styles.tileBreakdown}>
              <li>Resources: {metrics.pendingVerification.resources}</li>
              <li>Organizations: {metrics.pendingVerification.organizations}</li>
              <li>Opportunities: {metrics.pendingVerification.opportunities}</li>
              <li>Knowledge: {metrics.pendingVerification.knowledgeArticles}</li>
              <li>Academy: {metrics.pendingVerification.courses}</li>
            </ul>
          </Card>
        </Link>

        <Link href="/founder/stewardship" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>Open escalations</span>
            <span className={styles.tileValue}>{metrics.openEscalations}</span>
            <span className={styles.tileHint}>Stewardship oversight roster</span>
          </Card>
        </Link>

        <Link href="/founder/ai" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>AI spend (rolling 24h)</span>
            <span className={styles.tileValue}>
              ${metrics.aiSpend.totalCostUsd.toFixed(2)} / ${metrics.aiSpend.globalDailyBudgetUsd.toFixed(2)}
            </span>
            {metrics.aiSpend.emergencyStop ? (
              <span className={styles.badgeCritical}>Emergency stop active</span>
            ) : (
              <span className={styles.tileHint}>{metrics.aiSpend.requestCount} requests, {metrics.aiSpend.failedCount} failed</span>
            )}
          </Card>
        </Link>

        <Card className={styles.tile}>
          <span className={styles.tileLabel}>System health</span>
          <span className={metrics.databaseHealthy ? styles.badgeHealthy : styles.badgeCritical}>
            {metrics.databaseHealthy ? 'Database reachable' : 'Database unreachable'}
          </span>
          <span className={styles.tileHint}>
            Generated {new Date(metrics.generatedAt).toLocaleString()}
          </span>
        </Card>

        <Link href="/founder/announcements" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>Announcements</span>
            <span className={styles.tileHint}>Compose and publish platform-wide, role, or steward-audience notices</span>
          </Card>
        </Link>

        <Link href="/founder/governance" className={styles.tileLink}>
          <Card className={styles.tile}>
            <span className={styles.tileLabel}>Governance</span>
            <span className={styles.tileHint}>Constitutional documentation structure (read-only)</span>
          </Card>
        </Link>
      </div>
    </div>
  );
}
