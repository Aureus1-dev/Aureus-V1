'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export interface HighlightTargetDescriptor {
  /** Short, plain-language label the voice steward can reason about, e.g. "Your next mission". */
  label: string;
  /** Optional additional context. */
  description?: string;
}

interface HighlightTargetRegistration extends HighlightTargetDescriptor {
  element: HTMLElement;
  /** Invoked when this target is activated (e.g. to open a collapsed panel), in addition to being highlighted. */
  onActivate?: () => void;
}

export interface RegisteredTargetSummary {
  id: string;
  label: string;
  description?: string;
}

const HIGHLIGHT_DURATION_MS = 4000;

interface State {
  activeTargetId: string | null;
  /** Bumped on every register/unregister so consumers that need to react to "the set of targets changed" (without holding the whole map in state) can depend on a cheap primitive. */
  registryVersion: number;
}

interface HighlightRegistryContextValue {
  activeTargetId: string | null;
  register: (id: string, registration: HighlightTargetRegistration) => void;
  unregister: (id: string) => void;
  /** Scrolls to, visually highlights, and (if registered) activates a target. Returns whether the target was found. */
  activate: (id: string) => boolean;
  /** Moves keyboard focus to a target. Returns whether the target was found. */
  focusField: (id: string) => boolean;
  /** A stable snapshot of every currently-registered target, for describing "what's on screen" to the voice steward. */
  describeTargets: () => RegisteredTargetSummary[];
  registryVersion: number;
}

const HighlightRegistryContext = createContext<HighlightRegistryContextValue | null>(null);

/**
 * The Global Highlight Registry (DOMAIN-005 Founder Decision 4). Every
 * highlightable component registers itself under a stable semantic id
 * (`Home.NextMission`, `Opportunity.Card.<id>`, `Journey.Goal.Primary`)
 * rather than exposing a fragile CSS selector or DOM id to the voice
 * steward. The registry itself is a pure DOM-ref bookkeeping primitive —
 * it knows nothing about voice, routing, or any specific domain; the
 * bridge from "the steward asked to highlight X" to this registry lives
 * in `VoiceOrchestrator` alone (design-system/components/voice/VoiceOrchestrator.tsx).
 *
 * The target map itself is kept in a ref, not state — components
 * register/unregister on every mount/unmount (e.g. every `OpportunityCard`
 * in a results list), and none of that churn should re-render the rest
 * of the app. Only `activeTargetId` (what's currently highlighted) is
 * reactive state, since consuming components need to re-render to show
 * their own highlighted treatment.
 */
export function HighlightRegistryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ activeTargetId: null, registryVersion: 0 });
  const targetsRef = useRef(new Map<string, HighlightTargetRegistration>());
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const register = useCallback((id: string, registration: HighlightTargetRegistration) => {
    targetsRef.current.set(id, registration);
    setState((s) => ({ ...s, registryVersion: s.registryVersion + 1 }));
  }, []);

  const unregister = useCallback((id: string) => {
    targetsRef.current.delete(id);
    setState((s) => ({
      activeTargetId: s.activeTargetId === id ? null : s.activeTargetId,
      registryVersion: s.registryVersion + 1,
    }));
  }, []);

  const activate = useCallback((id: string) => {
    const target = targetsRef.current.get(id);
    if (!target) return false;

    target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.onActivate?.();
    setState((s) => ({ ...s, activeTargetId: id }));

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setState((s) => (s.activeTargetId === id ? { ...s, activeTargetId: null } : s));
    }, HIGHLIGHT_DURATION_MS);

    return true;
  }, []);

  const focusField = useCallback((id: string) => {
    const target = targetsRef.current.get(id);
    if (!target) return false;
    target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.element.focus();
    return true;
  }, []);

  const describeTargets = useCallback((): RegisteredTargetSummary[] => {
    return Array.from(targetsRef.current.entries()).map(([id, target]) => ({
      id,
      label: target.label,
      description: target.description,
    }));
  }, []);

  const value = useMemo(
    () => ({
      activeTargetId: state.activeTargetId,
      register,
      unregister,
      activate,
      focusField,
      describeTargets,
      registryVersion: state.registryVersion,
    }),
    [state.activeTargetId, state.registryVersion, register, unregister, activate, focusField, describeTargets],
  );

  return <HighlightRegistryContext.Provider value={value}>{children}</HighlightRegistryContext.Provider>;
}

export function useHighlightRegistry(): HighlightRegistryContextValue {
  const context = useContext(HighlightRegistryContext);
  if (!context) {
    throw new Error('useHighlightRegistry must be used within a HighlightRegistryProvider');
  }
  return context;
}

export interface UseRegisterHighlightTargetOptions {
  onActivate?: () => void;
}

export interface UseRegisterHighlightTargetResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isActive: boolean;
}

/**
 * The registration hook every highlightable component uses. Call it once
 * per component instance with a stable semantic id — registration and
 * cleanup happen automatically on mount/unmount and whenever the label
 * changes. By the time this effect runs, `ref.current` is guaranteed to
 * be attached (React commits DOM mutations before running effects).
 *
 * Deliberately tolerant of rendering outside a `HighlightRegistryProvider`
 * (`isActive` simply stays `false`, registration is skipped) rather than
 * throwing like `useHighlightRegistry` itself does. Highlighting is a
 * progressive enhancement on top of a component's real functionality,
 * not a hard dependency every consumer — and every test that renders
 * one — must carry.
 */
export function useRegisterHighlightTarget<T extends HTMLElement = HTMLElement>(
  id: string,
  descriptor: HighlightTargetDescriptor,
  options?: UseRegisterHighlightTargetOptions,
): UseRegisterHighlightTargetResult<T> {
  const context = useContext(HighlightRegistryContext);
  const ref = useRef<T | null>(null);
  const onActivateRef = useRef(options?.onActivate);
  onActivateRef.current = options?.onActivate;

  useEffect(() => {
    if (!context || !ref.current) return undefined;
    context.register(id, {
      element: ref.current,
      label: descriptor.label,
      description: descriptor.description,
      onActivate: onActivateRef.current ? () => onActivateRef.current?.() : undefined,
    });
    return () => context.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, descriptor.label, descriptor.description]);

  return { ref, isActive: context?.activeTargetId === id };
}
