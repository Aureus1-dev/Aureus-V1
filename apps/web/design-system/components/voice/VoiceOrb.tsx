'use client';

import { useEffect, useRef } from 'react';
import type { VoiceTurnState } from '../../../state';
import styles from './VoiceOrb.module.css';

export interface VoiceOrbProps {
  turnState: VoiceTurnState;
}

interface OrbProfile {
  base: number;
  amplitude: number;
  speed: number;
  jitter?: number;
  glowMultiplier: number;
}

const CALM: OrbProfile = { base: 0.3, amplitude: 0.035, speed: 0.0009, glowMultiplier: 2.1 };

const PROFILES: Record<VoiceTurnState, OrbProfile> = {
  idle: CALM,
  connecting: CALM,
  ended: CALM,
  listening: { base: 0.28, amplitude: 0.014, speed: 0.0022, glowMultiplier: 1.9 },
  thinking: { base: 0.31, amplitude: 0.06, speed: 0.0052, jitter: 0.022, glowMultiplier: 2.2 },
  speaking: { base: 0.36, amplitude: 0.1, speed: 0.006, glowMultiplier: 2.8 },
};

const FALLBACK_SIZE_PX = 112;

/** Mirrors build-theme-css.ts's own precedence exactly: an explicit override wins, otherwise the OS preference applies. */
function prefersReducedMotion(): boolean {
  const explicit = document.documentElement.getAttribute('data-reduced-motion');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readColor(canvas: HTMLCanvasElement, variable: string, fallback: string): string {
  const value = getComputedStyle(canvas).getPropertyValue(variable).trim();
  return value || fallback;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The steward's visual presence during live conversation (AFX-003 §2, §10:
 * "reduce anxiety rather than increase it... a trusted steward sitting
 * beside the member — not software demanding attention"; extended by the
 * Warm & Elemental identity direction, Founder-approved: "the Steward
 * should glow like a hearth, not light up like a screen"). A live canvas
 * ember — a three-stop radial gradient built from the emberCore/emberMid/
 * emberTip tokens, breathing at a pace set per turn state — rather than a
 * flat circle scaling up and down. Colors are read from the resolved CSS
 * custom properties at draw time, never hardcoded here, so light/dark
 * theme and any future palette revision apply with no changes to this
 * file. Purely decorative (aria-hidden); the accompanying
 * `VoiceStateLabel` carries the same information to assistive technology.
 */
export function VoiceOrb({ turnState }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const profile = PROFILES[turnState];
    const reduced = prefersReducedMotion();
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const size = canvas!.clientWidth || FALLBACK_SIZE_PX;
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
    }
    resize();
    // Not available in the jsdom test environment — the initial resize()
    // above still gives every test a valid, non-zero canvas to draw into.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);

    const core = readColor(canvas, '--color-ember-core', '#a8481f');
    const mid = readColor(canvas, '--color-ember-mid', '#d97e3d');
    const tip = readColor(canvas, '--color-ember-tip', '#f5c98a');

    let frameId: number | null = null;

    function draw(t: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const minSide = Math.min(w, h);

      ctx!.clearRect(0, 0, w, h);

      const wobble = Math.sin(t * profile.speed) * profile.amplitude;
      const jitter = profile.jitter ? Math.sin(t * profile.speed * 3.3) * profile.jitter : 0;
      const radius = minSide * (profile.base + wobble + jitter);

      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius * profile.glowMultiplier);
      glow.addColorStop(0, hexToRgba(tip, 0.5));
      glow.addColorStop(0.35, hexToRgba(mid, 0.2));
      glow.addColorStop(1, hexToRgba(core, 0));
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, w, h);

      const core3d = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
      core3d.addColorStop(0, tip);
      core3d.addColorStop(0.45, mid);
      core3d.addColorStop(1, core);
      ctx!.beginPath();
      ctx!.fillStyle = core3d;
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.fill();

      if (!reduced) {
        frameId = requestAnimationFrame(draw);
      }
    }

    draw(0);

    return () => {
      observer?.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [turnState]);

  return (
    <div className={styles.wrapper} aria-hidden="true">
      <div className={styles.ring} />
      <canvas ref={canvasRef} className={styles.orb} />
    </div>
  );
}
