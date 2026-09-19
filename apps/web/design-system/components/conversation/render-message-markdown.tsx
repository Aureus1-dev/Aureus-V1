import type { ReactNode } from 'react';
import styles from './Message.module.css';

/**
 * Renders a deliberately small, safe subset of Markdown the AI steward's
 * prose commonly produces — paragraphs, `#`/`##`/`###` headers, bulleted
 * and numbered lists, and inline bold/italic — as real React elements.
 *
 * This never uses `dangerouslySetInnerHTML`; every character outside the
 * handful of Markdown markers recognized below is rendered as plain text
 * exactly as received, so there is no HTML-injection surface and nothing
 * is silently dropped. This is presentation only: it changes how the
 * steward's own words are displayed, never what they say (FWO-002 "render
 * the response as returned, never rewrite it").
 */
export function renderMessageMarkdown(content: string): ReactNode {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className={styles.paragraph}>
        {renderInline(paragraph.join('\n'))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={`l-${blocks.length}`} className={styles.list}>
          {items}
        </ol>
      ) : (
        <ul key={`l-${blocks.length}`} className={styles.list}>
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const HeadingTag = (level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5';
      blocks.push(
        <HeadingTag key={`h-${blocks.length}`} className={styles.heading}>
          {renderInline(heading[2])}
        </HeadingTag>,
      );
      continue;
    }

    const bulletItem = /^[-*]\s+(.*)$/.exec(line);
    const numberedItem = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bulletItem || numberedItem) {
      flushParagraph();
      const ordered = Boolean(numberedItem);
      const text = (bulletItem ?? numberedItem)![1];
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(text);
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

/** Inline `**bold**` and `*italic*`/`_italic_` only — no other inline syntax is recognized. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      nodes.push(<em key={key++}>{match[2] ?? match[3]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}
