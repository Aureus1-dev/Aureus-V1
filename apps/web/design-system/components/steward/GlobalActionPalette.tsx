'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation, useHighlightRegistry, useInterfaceState } from '../../../state';
import { VisuallyHidden } from '../../accessibility';
import { primarySurfaces } from '../../navigation/surfaces';
import { INTERFACE_ALLOWED_PANEL_IDS } from './interface-tool-allowlists';
import styles from './GlobalActionPalette.module.css';

const STEWARD_PANEL_ID = INTERFACE_ALLOWED_PANEL_IDS[0];

type PaletteOption =
  | { kind: 'navigate'; id: string; label: string; href: string }
  | { kind: 'highlight'; id: string; label: string; targetId: string }
  | { kind: 'ask'; id: 'ask'; label: string };

/**
 * The universal AI command surface (DOMAIN-007 Founder Decision 4):
 * Cmd+K / Ctrl+K, a visible accessible trigger, full keyboard-only
 * operation, and touch-friendly controls. Deterministic navigation is
 * derived directly from the canonical `navigation/surfaces.ts` registry
 * — "do not maintain a third independent route allowlist" — a
 * deliberately broader, purely client-dispatched list than the AI tool's
 * own narrow, backend-validated `navigate_to_route` allow-list, since a
 * member's own explicit click needs no model involvement or backend
 * re-validation at all.
 *
 * The free-text "Ask your Steward" entry is the one path that does go
 * through the backend: it sends the query via the same `ConversationContext.
 * sendMessage` every other text interaction uses, tools included, so any
 * safe interface action the steward decides on is executed by the
 * already-mounted `TextInterfaceOrchestrator` exactly as it would be from
 * `/conversation` itself — the palette does not invent a second dispatch
 * path.
 */
export function GlobalActionPalette() {
  const router = useRouter();
  const { activate, describeTargets } = useHighlightRegistry();
  const { openPanel } = useInterfaceState();
  const conversation = useConversation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCommandK) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const options = useMemo<PaletteOption[]>(() => {
    const normalized = query.trim().toLowerCase();
    const navOptions: PaletteOption[] = primarySurfaces
      .filter((surface) => !normalized || surface.label.toLowerCase().includes(normalized))
      .map((surface) => ({ kind: 'navigate', id: `nav-${surface.id}`, label: surface.label, href: surface.href }));

    const highlightOptions: PaletteOption[] = describeTargets()
      .filter((target) => !normalized || target.label.toLowerCase().includes(normalized))
      .map((target) => ({ kind: 'highlight', id: `highlight-${target.id}`, label: target.label, targetId: target.id }));

    const askOption: PaletteOption[] = query.trim()
      ? [{ kind: 'ask', id: 'ask', label: `Ask your Steward: "${query.trim()}"` }]
      : [];

    return [...navOptions, ...highlightOptions, ...askOption];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function selectOption(option: PaletteOption) {
    if (option.kind === 'navigate') {
      router.push(option.href);
      close();
      return;
    }
    if (option.kind === 'highlight') {
      activate(option.targetId);
      close();
      return;
    }
    const interfaceContext = describeTargets()
      .map((t) => `${t.id} (${t.label})`)
      .join(', ');
    const content = query.trim();
    close();
    openPanel(STEWARD_PANEL_ID);
    await conversation.sendMessage(interfaceContext || undefined, content);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) void selectOption(option);
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">Ask Aureus</span>
        <span className={styles.kbdHint} aria-hidden="true">
          &#8984;K
        </span>
        <VisuallyHidden>Open the command palette</VisuallyHidden>
      </button>

      {isOpen ? (
        <div className={styles.backdrop} onClick={close}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-label="Command palette"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Go somewhere, highlight something, or ask your Steward…"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="palette-listbox"
              aria-activedescendant={options[activeIndex] ? `palette-option-${options[activeIndex].id}` : undefined}
              aria-label="Command palette search"
            />
            {options.length === 0 ? (
              <p className={styles.empty}>Nothing matches — try asking your Steward instead.</p>
            ) : (
              <div className={styles.list} role="listbox" id="palette-listbox">
                {options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    id={`palette-option-${option.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? `${styles.option} ${styles.optionActive}` : styles.option}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => void selectOption(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
