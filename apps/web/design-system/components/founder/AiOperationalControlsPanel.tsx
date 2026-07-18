'use client';

import { useEffect, useState } from 'react';
import { useFounder } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { FormField } from '../FormField/FormField';
import styles from './AiOperationalControlsPanel.module.css';

const REQUESTS_PAGE_SIZE = 20;

/**
 * AI Operational Controls (PR-003 Founder Operating System) — the live,
 * DB-backed successor to PR-002's env-var-only AI budget controls. A
 * change here takes effect on the very next AI request platform-wide, no
 * restart required (`AiOperationalConfigService`). Also surfaces the
 * platform-wide AI spend summary and request audit log the same backend
 * domain module already exposes.
 */
export function AiOperationalControlsPanel() {
  const { state, loadAiConfig, saveAiConfig, loadAiSpendSummary, loadAiRequests, loadMetrics } = useFounder();
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [globalDailyBudgetUsd, setGlobalDailyBudgetUsd] = useState('');
  const [userDailyBudgetUsd, setUserDailyBudgetUsd] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadAiConfig();
    void loadAiSpendSummary();
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAiConfig, loadAiSpendSummary, loadMetrics]);

  useEffect(() => {
    void loadAiRequests({ page, limit: REQUESTS_PAGE_SIZE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAiRequests, page]);

  useEffect(() => {
    if (state.aiConfig) {
      setEmergencyStop(state.aiConfig.emergencyStop);
      setGlobalDailyBudgetUsd(String(state.aiConfig.globalDailyBudgetUsd));
      setUserDailyBudgetUsd(String(state.aiConfig.userDailyBudgetUsd));
    }
  }, [state.aiConfig]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void saveAiConfig({
      emergencyStop,
      globalDailyBudgetUsd: Number(globalDailyBudgetUsd),
      userDailyBudgetUsd: Number(userDailyBudgetUsd),
    });
  }

  if (state.isLoadingAiConfig && !state.aiConfig) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing AI operational controls" />
      </div>
    );
  }

  if (state.error && !state.aiConfig) {
    return (
      <ErrorState
        title="AI operational controls couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void loadAiConfig()}>Try again</Button> : undefined}
      />
    );
  }

  if (!state.aiConfig) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>AI Operational Controls</h1>
      <p className={styles.intro}>
        Changes take effect on the next AI request, platform-wide — no restart required.
      </p>

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={emergencyStop}
              onChange={(event) => setEmergencyStop(event.target.checked)}
            />
            <span>Emergency stop — disable AI features platform-wide</span>
          </label>

          <FormField
            id="global-daily-budget"
            label="Platform-wide daily AI budget (USD)"
            type="number"
            min="0"
            step="0.01"
            value={globalDailyBudgetUsd}
            onChange={setGlobalDailyBudgetUsd}
          />

          <FormField
            id="user-daily-budget"
            label="Per-member daily AI quota (USD)"
            type="number"
            min="0"
            step="0.01"
            value={userDailyBudgetUsd}
            onChange={setUserDailyBudgetUsd}
          />

          <Button type="submit" disabled={state.isSavingAiConfig}>
            {state.isSavingAiConfig ? 'Saving…' : 'Save controls'}
          </Button>
        </form>
      </Card>

      {state.aiSpend ? (
        <Card className={styles.spendCard}>
          <h2 className={styles.sectionTitle}>Spend (rolling 24h)</h2>
          <p className={styles.spendAmount}>
            ${state.aiSpend.totalCostUsd.toFixed(2)} / ${state.aiSpend.globalDailyBudgetUsd.toFixed(2)}
          </p>
          <p className={styles.tileHint}>
            {state.aiSpend.requestCount} requests, {state.aiSpend.failedCount} failed
          </p>
          {state.aiSpend.emergencyStop ? <p className={styles.badgeCritical}>Emergency stop active</p> : null}
        </Card>
      ) : null}

      {state.metrics && state.metrics.aiSpendByCapability.length > 0 ? (
        <Card className={styles.spendCard}>
          <h2 className={styles.sectionTitle}>Spend by capability (rolling 24h)</h2>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Requests</th>
                  <th scope="col">Failed</th>
                </tr>
              </thead>
              <tbody>
                {state.metrics.aiSpendByCapability.map((row) => (
                  <tr key={row.capability}>
                    <td>{row.capability}</td>
                    <td>${row.totalCostUsd.toFixed(4)}</td>
                    <td>{row.requestCount}</td>
                    <td>{row.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {state.metrics ? (
        <Card className={styles.spendCard}>
          <h2 className={styles.sectionTitle}>Orchestration activity (rolling 24h)</h2>
          <p className={styles.spendAmount}>{state.metrics.orchestrationRunsToday} runs</p>
          {state.metrics.orchestrationRunsByGoal.length > 0 ? (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Goal</th>
                    <th scope="col">Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {state.metrics.orchestrationRunsByGoal.map((row) => (
                    <tr key={row.goal}>
                      <td>{row.goal}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.tileHint}>No orchestration runs yet.</p>
          )}
        </Card>
      ) : null}

      <Card className={styles.auditCard}>
        <h2 className={styles.sectionTitle}>Request audit log</h2>
        {state.isLoadingAiRequests && state.aiRequests.length === 0 ? (
          <LoadingState label="Loading request history" />
        ) : state.aiRequests.length === 0 ? (
          <p className={styles.tileHint}>No AI requests yet.</p>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Capability</th>
                    <th scope="col">Model</th>
                    <th scope="col">Cost</th>
                    <th scope="col">Status</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {state.aiRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.capability}</td>
                      <td>{request.model}</td>
                      <td>${request.costUsd.toFixed(4)}</td>
                      <td>{request.status}</td>
                      <td>{new Date(request.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={state.aiRequestsTotal === null || page * REQUESTS_PAGE_SIZE >= state.aiRequestsTotal}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
