'use client';

import { useState } from 'react';
import type { ResultArtifact } from './engine/types';
import styles from './ResultArtifactCard.module.css';

export interface ResultArtifactCardProps {
  artifact: ResultArtifact;
}

/**
 * Durable result/artifact object (portfolio §6 State C "FOUND"; addendum
 * §7). A named object, not a message buried in the transcript — carries
 * name, status, currentness, related matter, evidence/provenance, what
 * remains, and done means, per the addendum's required field list.
 */
export function ResultArtifactCard({ artifact }: ResultArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={styles.card} aria-labelledby={`artifact-name-${artifact.id}`}>
      <div className={styles.summary}>
        <div>
          <p className={styles.eyebrow}>Result</p>
          <h2 id={`artifact-name-${artifact.id}`} className={styles.name}>
            {artifact.name}
          </h2>
          <p className={styles.meta}>
            {artifact.status} · {artifact.currentness}
          </p>
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={`artifact-detail-${artifact.id}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details' : 'View result'}
        </button>
      </div>

      {expanded ? (
        <div id={`artifact-detail-${artifact.id}`} className={styles.detail}>
          <dl className={styles.fields}>
            <div className={styles.field}>
              <dt>Related matter</dt>
              <dd>{artifact.relatedMatter}</dd>
            </div>
            <div className={styles.field}>
              <dt>Evidence</dt>
              <dd>
                <ul className={styles.evidenceList}>
                  {artifact.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {artifact.whatRemains ? (
              <div className={styles.field}>
                <dt>What remains</dt>
                <dd>{artifact.whatRemains}</dd>
              </div>
            ) : null}
            <div className={styles.field}>
              <dt>Done means</dt>
              <dd>{artifact.doneMeans}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
