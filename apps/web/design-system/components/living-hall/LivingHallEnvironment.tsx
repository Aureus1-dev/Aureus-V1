'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { HALL_LIGHTING_STATES, lightingStateAt, type HallRoomId } from './hall-manifest';
import styles from './LivingHallEnvironment.module.css';

const SLEEPING_ASSET = HALL_LIGHTING_STATES[0].asset;
const DEPTH_ASSET = '/environments/hall/render-passes/hall-depth-white-near.webp';

export interface LivingHallEnvironmentProps {
  room?: HallRoomId;
  soundEnabled?: boolean;
  wakeOnMount?: boolean;
}

function motionIsReduced(): boolean {
  const explicit = document.documentElement.getAttribute('data-reduced-motion');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function playMorningChirp() {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;
  const context = new AudioContextConstructor();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
  gain.connect(context.destination);

  [0, 0.16].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1450 + index * 180, context.currentTime + offset);
    oscillator.frequency.exponentialRampToValueAtTime(
      2050 + index * 220,
      context.currentTime + offset + 0.12,
    );
    oscillator.connect(gain);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + 0.2);
  });

  window.setTimeout(() => void context.close(), 700);
}

function startHallAmbience(): () => void {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return () => undefined;

  const context = new AudioContextConstructor();
  const seconds = 2;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  // One quiet shared noise source becomes distant wind and the soft body
  // of the hearth. It is intentionally below speech and only exists after
  // an explicit member gesture enables sound.
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const wind = context.createBiquadFilter();
  wind.type = 'lowpass';
  wind.frequency.value = 520;
  const windGain = context.createGain();
  windGain.gain.value = 0.006;

  const hearth = context.createBiquadFilter();
  hearth.type = 'bandpass';
  hearth.frequency.value = 1450;
  hearth.Q.value = 0.7;
  const hearthGain = context.createGain();
  hearthGain.gain.value = 0.0035;

  source.connect(wind).connect(windGain).connect(context.destination);
  source.connect(hearth).connect(hearthGain).connect(context.destination);
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      // The browser may already have stopped the source while suspending a tab.
    }
    void context.close();
  };
}

/**
 * The persistent visual underlay for every member surface. It is deliberately
 * atmospheric only: every interactive element lives in the fixed interface
 * above it, while this layer follows local time, responds gently to deliberate
 * pointer movement, and withdraws entirely under reduced motion.
 */
export function LivingHallEnvironment({
  room = 'hall',
  soundEnabled = false,
  wakeOnMount = true,
}: LivingHallEnvironmentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const chirpedRef = useRef(false);
  const [lighting, setLighting] = useState(HALL_LIGHTING_STATES[0]);
  const [awake, setAwake] = useState(!wakeOnMount);

  useEffect(() => {
    const resolveLighting = () => setLighting(lightingStateAt(new Date()));
    resolveLighting();
    const interval = window.setInterval(resolveLighting, 60_000);
    const wake = window.setTimeout(() => setAwake(true), motionIsReduced() ? 0 : 40);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(wake);
    };
  }, []);

  useEffect(() => {
    if (motionIsReduced()) return;
    const move = (event: PointerEvent) => {
      const x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      rootRef.current?.style.setProperty('--hall-shift-x', `${(x * 4).toFixed(2)}px`);
      rootRef.current?.style.setProperty('--hall-shift-y', `${(y * 4).toFixed(2)}px`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const isMorning = lighting.id === 'dawn' || lighting.id === 'morning';
    if (!soundEnabled || !isMorning || chirpedRef.current) return;
    chirpedRef.current = true;
    playMorningChirp();
  }, [lighting.id, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) return;
    return startHallAmbience();
  }, [soundEnabled]);

  const activeStyle = {
    '--hall-image': `url("${lighting.asset}")`,
    '--hall-depth': `url("${DEPTH_ASSET}")`,
  } as CSSProperties;
  const sleepingStyle = { '--hall-image': `url("${SLEEPING_ASSET}")` } as CSSProperties;
  const birdIsPresent = lighting.id === 'dawn' || lighting.id === 'morning';

  return (
    <div
      ref={rootRef}
      className={styles.environment}
      data-awake={awake ? 'true' : 'false'}
      data-lighting={lighting.id}
      data-room={room}
      aria-hidden="true"
    >
      <div className={styles.sleepingPlate} style={sleepingStyle} />
      <div className={styles.activePlate} style={activeStyle} />
      <div className={styles.depthPlate} style={activeStyle} />
      <div className={styles.roomWash} />
      <div className={styles.fireBreath} />
      <div className={styles.leafShadow} />
      {birdIsPresent ? <div className={styles.bird} /> : null}
      <div className={styles.vignette} />
    </div>
  );
}
