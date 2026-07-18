import { Card } from '../Card/Card';
import styles from './GovernanceMonitoringPanel.module.css';

interface DocDirectory {
  path: string;
  files: string[];
}

const PROTECTED_DIRECTORIES: DocDirectory[] = [
  {
    path: 'docs/constitution/',
    files: [
      'OAS-002-Preamble-to-the-Constitution.md',
      'OAS-003-Identity-Mission-Vision-and-Purpose.md',
      'OAS-004-Membership-Rights-and-Responsibilities.md',
      'OAS-005-Constitutional-Interpretation-Amendment-and-Document-Hierarchy.md',
      'OAS-006-Stewardship-Governance-and-Leadership.md',
      'OAS-007-Duties-Responsibilities-and-Civic-Obligations.md',
      'OAS-008-Membership-Citizenship-Belonging-and-Participation.md',
      'OAS-009-Governance-Constitutional-Institutions-and-the-Distribution-of-Authority.md',
      'OAS-010-Constitutional-Amendment-Process-Canonization-and-Stewardship-of-the-Constitutional-Record.md',
      'OAS-011-Constitutional-Justice-Review-Dispute-Resolution-and-Due-Process.md',
      'OAS-ACA-001-Human-Flourishing.md',
      'OAS-ACA-002-The-Next-Right-Step.md',
      'OAS-ACA-006-Institutional-Wisdom.md',
      'OAS-ACA-007-Community.md',
      'OAS-ACA-007-Truth-Ledger.md',
    ],
  },
  {
    path: 'docs/docs/constitution/',
    files: [
      'OAS-002-Preamble.md',
      'OAS-003-Identity-Mission-Vision-and-Purpose.md',
      'OAS-004-Foundational-Principles-and-Eternal-Laws.md',
      'OAS-005-Definitions-and-Rules-of-Constitutional-Interpretation.md',
      'OAS-006-Rights-Human-Dignity-Agency-and-Constitutional-Protections.md',
      'OAS-ACA-004-Calling.md',
      'OAS-ACA-005-Stewardship.md',
      'OAS-ACA-009-Pods.md',
      'OAS-ACA-010-Shared-Prosperity-and-Resource-Stewardship.md',
    ],
  },
  { path: 'docs/constitutional/register/', files: ['CAP-REGISTER.md'] },
  { path: 'docs/sessions/', files: ['Session-001-Constitutional-Closeout.md'] },
  { path: 'docs/drafts/', files: ['OAS-001_Draft_0.95.md'] },
];

interface KnownConflict {
  identifier: string;
  description: string;
}

const KNOWN_CONFLICTS: KnownConflict[] = [
  {
    identifier: 'OAS-004',
    description:
      'docs/constitution/ titles it "Membership Rights and Responsibilities"; docs/docs/constitution/ titles it ' +
      '"Foundational Principles and Eternal Laws" — the same document number covers two unrelated subjects.',
  },
  {
    identifier: 'OAS-005',
    description:
      'docs/constitution/ covers "Constitutional Interpretation, Amendment, and Document Hierarchy"; ' +
      'docs/docs/constitution/ covers "Definitions and Rules of Constitutional Interpretation" — overlapping scope, diverging content.',
  },
  {
    identifier: 'OAS-006',
    description:
      'docs/constitution/ titles it "Stewardship, Governance, and Leadership"; docs/docs/constitution/ titles it ' +
      '"Rights, Human Dignity, Agency, and Constitutional Protections" — the same document number covers two unrelated subjects.',
  },
  {
    identifier: 'OAS-002 / OAS-003',
    description:
      'Present in both directories under near-identical titles — likely duplicates or near-duplicates, not yet diffed for drift.',
  },
  {
    identifier: 'OAS-ACA-007',
    description:
      'Two documents share this number within docs/constitution/ itself: "Community" and "Truth Ledger."',
  },
  {
    identifier: 'OAS-007 through OAS-011',
    description: 'Present only in docs/constitution/, with no counterpart in docs/docs/constitution/ — coverage gap, not a conflict, but part of the same unresolved hierarchy question.',
  },
];

/**
 * The Founder Operating System's Governance monitoring panel (PR-003) —
 * strictly read-only, per the standing constraint set when the Founder
 * asked for a side-by-side diff before any change: "Give me a side-by-side
 * diff of every conflict first... Make no changes to the repository."
 * That full diff was delivered as `Constitutional-Conflict-Comparison.md`,
 * an artifact handed directly to the Founder — it was never committed to
 * this repository, so it cannot be rendered here. This panel surfaces only
 * what the repository itself already shows: which files live under each
 * protected path, and the document-number collisions visible from their
 * names alone. No edit, merge, or delete action exists on this page, and
 * none should ever be added until the Founder designates canonical
 * versions — this component must stay presentation-only.
 */
export function GovernanceMonitoringPanel() {
  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>Governance</h1>
      <p className={styles.intro}>
        Constitutional documentation structure — read-only. No file here may be edited, merged, or deleted from the
        Founder Operating System, or from anywhere else, until the Founder reviews the full comparison and designates
        canonical versions.
      </p>

      <Card className={styles.noticeCard} role="note">
        <p className={styles.noticeText}>
          The full side-by-side diff of every conflict lives in <strong>Constitutional-Conflict-Comparison.md</strong>,
          delivered directly to the Founder as an artifact — it was never committed to this repository and cannot be
          shown here. What follows is only the file structure and the document-number collisions the repository
          itself already makes visible.
        </p>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Known conflicts ({KNOWN_CONFLICTS.length})</h2>
        <ul className={styles.conflictList}>
          {KNOWN_CONFLICTS.map((conflict) => (
            <li key={conflict.identifier} className={styles.conflictItem}>
              <span className={styles.conflictIdentifier}>{conflict.identifier}</span>
              <p className={styles.conflictDescription}>{conflict.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Protected paths</h2>
        <div className={styles.directoryGrid}>
          {PROTECTED_DIRECTORIES.map((directory) => (
            <div key={directory.path} className={styles.directory}>
              <h3 className={styles.directoryPath}>{directory.path}</h3>
              <ul className={styles.fileList}>
                {directory.files.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
