import { MemorySidebar } from '../memory/MemorySidebar';
import styles from './StewardPanel.module.css';

/**
 * The docked right-hand Steward context panel (Living Steward Workspace
 * redesign) — distinct from the existing floating `StewardWorkspace`
 * (bottom-right pill/panel, on-demand and AI-triggered via
 * `InterfaceContext.openPanelIds`'s fixed `steward-workspace` id, which
 * this does not rename or replace). `StewardPanel` is the always-visible
 * ambient column; `MemorySidebar` supplies its actual content.
 */
export function StewardPanel() {
  return (
    <aside className={styles.panel} aria-label="Steward context">
      <h2 className={styles.title}>Your Steward</h2>
      <MemorySidebar />
    </aside>
  );
}
