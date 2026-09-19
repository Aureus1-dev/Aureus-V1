import type { ReactNode } from 'react';
import styles from './Message.module.css';

/**
 * Renders a deliberately small, safe subset of Markdown the AI steward's
 * prose commonly produces — paragraphs, `#`/`##`/`###` headers, bulleted
 * and numbered lists, inline bold/italic/code, and `[text](url)` links —
 * as real React elements.
 *
 * This never uses `dangerouslySetInnerHTML`; every character outside the
 * handful of Markdown markers recognized below is rendered as plain text
 * exactly as received, so there is no HTML-injection surface and nothing
 * is silently dropped. This is presentation only: it changes how the
 * steward's own words are displayed, never what they say (FWO-002 "render
 * the response as returned, never rewrite it") — including an ordered
 * list's own numbering, which is preserved exactly as written (`3.` stays
 * `3.`, a skipped `5.` stays a skipped `5.`), never renumbered to `1.`/`2.`.
 *
 * Deliberately NOT supported — recognized as too rare in steward replies
 * to justify the added surface, and left as plain visible text rather than
 * silently dropped: fenced/indented code blocks, blockquotes, nested lists,
 * tables, images. If steward replies start using these often, extend this
 * renderer (with matching tests) rather than reach for a general-purpose
 * Markdown library — the point of a small hand-written subset is that every
 * construct it accepts is one this file's tests actually cover.
 */
export function renderMessageMarkdown(content: string): ReactNode {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: { text: string; number: number }[] } | null = null;

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
    const items = list.items.map((item, index) => (
      <li key={index} value={list!.ordered ? item.number : undefined}>
        {renderInline(item.text)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`l-${blocks.length}`} className={styles.list} start={list.items[0]?.number}>
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
    const numberedItem = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (bulletItem || numberedItem) {
      flushParagraph();
      const ordered = Boolean(numberedItem);
      const text = ordered ? numberedItem![2] : bulletItem![1];
      const number = ordered ? Number(numberedItem![1]) : 0;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push({ text, number });
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

const SAFE_LINK_SCHEMES = ['http://', 'https://', 'mailto:'];

function isSafeLinkHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return SAFE_LINK_SCHEMES.some((scheme) => trimmed.startsWith(scheme));
}

/**
 * Inline `**bold**`, `*italic*`/`_italic_`, `` `code` ``, and
 * `[text](url)` only — no other inline syntax is recognized. A link whose
 * URL is not `http(s):`/`mailto:` is rendered as plain text (the literal
 * `[text](url)`) rather than as a clickable link, so nothing can smuggle a
 * `javascript:`-scheme or other unsafe href into a real anchor.
 *
 * The code-span pattern requires a single backtick not itself adjacent to
 * another backtick, so a ``` fenced-code marker (unsupported — see the
 * module doc comment) is never partially consumed as a stray code span;
 * it falls all the way through as fully literal text instead.
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|(?<!`)`(?!`)([^`\n]+?)(?<!`)`(?!`)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [full, bold, italicStar, italicUnderscore, code, linkText, linkHref] = match;
    if (bold !== undefined) {
      nodes.push(<strong key={key++}>{bold}</strong>);
    } else if (code !== undefined) {
      nodes.push(
        <code key={key++} className={styles.code}>
          {code}
        </code>,
      );
    } else if (linkText !== undefined && linkHref !== undefined) {
      if (isSafeLinkHref(linkHref)) {
        nodes.push(
          <a key={key++} className={styles.link} href={linkHref} target="_blank" rel="noreferrer">
            {linkText}
          </a>,
        );
      } else {
        nodes.push(full);
      }
    } else {
      nodes.push(<em key={key++}>{italicStar ?? italicUnderscore}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}
