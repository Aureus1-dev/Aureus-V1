import type { StewardPresence } from './environment.types';
import styles from './HallHearth.module.css';

export interface HallHearthProps {
  /**
   * The Steward's own response within the hearth. Defaults to `resting`,
   * which is the only state arrival can honestly drive — see below.
   */
  presence?: StewardPresence;
}

/**
 * The Aureus Hearth: the universal light of the house, set into the
 * architecture at the centre of the Hall.
 *
 * ── What this is not ──────────────────────────────────────────────────
 *
 * It is **not the Member's Mark**. AUREUS-013 is unambiguous: the Mark is
 * *personal*, "never assigned to rank members", unique to one member, and
 * revealed only "when a member chooses to make Aureus their home by
 * creating and saving their account". The hearth is the opposite of all
 * four — it is universal, identical for everyone, present before anyone
 * has an account, and belongs to the house rather than to a person. A
 * member who arrives and sees this light must not later be shown their
 * Mark and think they have already met it. Nothing in this file may ever
 * be reused to render a Mark.
 *
 * It is also not a button, an orb, or a status indicator. It does not
 * pulse, and it is never used to demand attention.
 *
 * ── What it is ────────────────────────────────────────────────────────
 *
 * "The Aureus Mark serves as the architectural centre of the Hall.
 * Everything else supports that centre" (AUREUS-003 §ARCHITECTURE), and
 * a centre made of light needs something to rest in — so the light sits
 * in a carved stone recess with a bronze lip, built into the rear wall
 * rather than floating in front of it. That is what makes it read as
 * architecture instead of an interface element.
 *
 * It breathes, slowly, because it is alive. It says one thing: we are
 * here.
 *
 * ── The Steward within it ─────────────────────────────────────────────
 *
 * The Steward is related to the hearth but distinct from it: the hearth
 * is the constant light of Aureus, and `.presence` is the Steward's own
 * inner response inside that light, plus a quiet line in the stone that
 * brightens when the Steward is engaged. Related, visibly not the same
 * thing — which is the distinction a member needs in order to eventually
 * understand that Aureus is the house, the Steward speaks within it, and
 * their Mark will be theirs alone.
 *
 * Only `resting` is driven during arrival, because arrival has no live
 * Steward turn state to read, and AUREUS-004 §PRESENCE forbids inventing
 * urgency the system cannot justify. The other states are implemented
 * and typed so the surfaces that *do* hold that state can pass it in
 * without this component changing.
 */
export function HallHearth({ presence = 'resting' }: HallHearthProps) {
  return (
    <div className={styles.hearth} data-presence={presence} aria-hidden="true">
      {/* The recess cut into the wall, and the bronze lip that catches light. */}
      <div className={styles.recess}>
        <div className={styles.lip} />
        {/* The light of Aureus itself. */}
        <div className={styles.light} />
        {/* The Steward's response within that light. */}
        <div className={styles.presence} />
      </div>
      {/* What the hearth throws onto the wall and floor around it. */}
      <div className={styles.spill} />
      {/* The quiet line in the stone that answers when the Steward is engaged. */}
      <div className={styles.attendLine} />
    </div>
  );
}
