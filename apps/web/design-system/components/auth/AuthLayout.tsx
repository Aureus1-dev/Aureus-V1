import type { ReactNode } from 'react';
import { LivingHallEnvironment } from '../living-hall/LivingHallEnvironment';
import styles from './AuthLayout.module.css';

export interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared pre-authentication shell. Navigation chrome stays out of the way,
 * but the Living Hall does not disappear just because the member is signing
 * in, registering, verifying email, or recovering access. Authentication is
 * a doorway into the same place, not a separate generic product surface.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <LivingHallEnvironment room="hall" wakeOnMount />
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
