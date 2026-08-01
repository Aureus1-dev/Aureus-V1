'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrivalStage } from '../arrival';
import { Button } from '../Button/Button';
import { FormField } from '../FormField';
import styles from './HomeHall.module.css';

/**
 * Home, for a member who has no active mission yet.
 *
 * Founder decision: "The empty Home state SHALL use the full-bleed
 * Living Hall. The Hall is not a card or contained surface inside
 * AppShell. It is the member's primary environment. When no active
 * content is present, render the Hall itself with the Hearth, quiet
 * Steward presence, 'How can we help?', and one calm input affordance."
 *
 * So this is not an empty state in the usual sense. There is no card, no
 * illustration, and no menu of rooms — AUREUS-003 §VISUAL HIERARCHY
 * allows the Hall one unmistakable focal point, and that is the hearth,
 * not a grid of things to click. What a member finds is the room, the
 * light, and the question Aureus always opens with.
 *
 * The Steward's presence is `resting` — the Hall's own default, since
 * nothing has been asked yet. This no longer raises a room of its own to
 * say so: the Hall is permanent now and already standing, and a second
 * one nested inside it would give the member two floors and two hearths.
 * What was a component that built a room is now simply what the member
 * finds standing in the one that is already there.
 *
 * What the member types is carried into the guided arrival rather than
 * discarded — an input that loses your words would be worse than no
 * input at all. It travels as `?need=`, and `FirstRunWelcome` opens at
 * the immediate-need step with the field already filled, reusing the
 * same mechanism `?newMission=true` has always used to start there. No
 * arrival decision logic changes; the member simply arrives at that step
 * having already spoken.
 */
export function HomeHall() {
  const router = useRouter();
  const [need, setNeed] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = need.trim();
    if (!trimmed) return;
    router.push(`/welcome?need=${encodeURIComponent(trimmed)}`);
  }

  return (
    <ArrivalStage stepKey="home-hall">
      <div className={styles.hall}>
        <h1 className={styles.question}>How can we help?</h1>
        <p className={styles.body}>
          Tell us what&apos;s going on, in your own words. Whatever it is — big or small.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="home-need"
            multiline
            label="What brings you here today"
            value={need}
            onChange={setNeed}
            placeholder="e.g. I need help finding a better job"
          />
          <Button type="submit" disabled={!need.trim()}>
            Continue
          </Button>
        </form>
      </div>
    </ArrivalStage>
  );
}
