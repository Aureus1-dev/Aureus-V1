import type { ReactNode } from 'react';
import styles from './Room.module.css';

export interface RoomProps {
  title: string;
  description?: string;
  /** An affordance placed alongside the title (e.g. a "back" link) — kept separate from `children` so it never scrolls with the room's content. */
  headerAction?: ReactNode;
  children?: ReactNode;
}

/**
 * The named-Room chrome shared by every routed surface in the Living
 * Steward Workspace (Journey Review, Opportunity Workspace, Planning
 * Table, Document Review, Community Space, Calendar). Changing rooms
 * should feel like an atmosphere change inside one building, not a
 * navigation to another application — this is the one consistent frame
 * every room's own content sits inside, softer than a plain `Card`
 * (`radius.xl`, `surfaceSunken`) since a whole room, not a single piece
 * of information, lives inside it.
 */
export function Room({ title, description, headerAction, children }: RoomProps) {
  return (
    <section className={styles.room}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {headerAction}
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
