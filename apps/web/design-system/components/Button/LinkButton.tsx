import type { ComponentProps } from 'react';
import Link from 'next/link';
import styles from './Button.module.css';
import type { ButtonVariant } from './Button';

export interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant;
  className?: string;
}

/**
 * A link that looks like a button — for navigation that is presented as
 * a primary action ("Go to Welcome", "Start a new mission").
 *
 * This exists because the pattern it replaces, `<Link><Button/></Link>`,
 * is invalid HTML: a `<button>` nested inside an `<a>` is interactive
 * content inside interactive content. Browsers recover from it by
 * exposing *both* elements, so every one of those sites produced two
 * consecutive tab stops with the same accessible name — a keyboard
 * member pressed Tab twice for one action, and a screen reader announced
 * the same control twice in a row.
 *
 * Navigation is what an anchor is for, so the element is the anchor and
 * the button is only its appearance. It shares `Button.module.css`
 * rather than restyling, so the two stay visually identical by
 * construction — including the 44px minimum height that makes them
 * usable as touch targets.
 */
export function LinkButton({ variant = 'primary', className, ...rest }: LinkButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary;
  return <Link className={[styles.button, variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}
