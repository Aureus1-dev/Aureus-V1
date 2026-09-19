import { render, screen } from '@testing-library/react';
import { renderMessageMarkdown } from './render-message-markdown';

describe('renderMessageMarkdown', () => {
  it('renders bulleted list markers as a real list, not literal dashes', () => {
    render(<div>{renderMessageMarkdown('- First step\n- Second step')}</div>);
    const list = screen.getByRole('list');
    const items = screen.getAllByRole('listitem');
    expect(list.tagName).toBe('UL');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('First step');
    expect(screen.queryByText(/^- /)).not.toBeInTheDocument();
  });

  it('renders numbered list markers as an ordered list', () => {
    render(<div>{renderMessageMarkdown('1. First\n2. Second')}</div>);
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('preserves each item’s written ordinal exactly, never renumbering from 1', () => {
    const { container } = render(
      <div>{renderMessageMarkdown('3. Upload the form\n4. Call the office')}</div>,
    );
    const ol = container.querySelector('ol')!;
    const items = ol.querySelectorAll('li');
    expect(ol.getAttribute('start')).toBe('3');
    expect(items[0].getAttribute('value')).toBe('3');
    expect(items[0]).toHaveTextContent('Upload the form');
    expect(items[1].getAttribute('value')).toBe('4');
    expect(items[1]).toHaveTextContent('Call the office');
  });

  it('preserves a gap in written numbering (e.g. 3 then 5) rather than closing it', () => {
    const { container } = render(<div>{renderMessageMarkdown('3. Third\n5. Fifth')}</div>);
    const items = container.querySelectorAll('ol > li');
    expect(items[0].getAttribute('value')).toBe('3');
    expect(items[1].getAttribute('value')).toBe('5');
  });

  it('supports the "1)" numbered-list variant with the same ordinal preservation', () => {
    const { container } = render(<div>{renderMessageMarkdown('2) Second\n3) Third')}</div>);
    const items = container.querySelectorAll('ol > li');
    expect(items[0].getAttribute('value')).toBe('2');
    expect(items[1].getAttribute('value')).toBe('3');
  });

  it('renders a heading line as a heading element, not literal hashes', () => {
    render(<div>{renderMessageMarkdown('## What to do next')}</div>);
    expect(screen.getByRole('heading', { name: 'What to do next' })).toBeInTheDocument();
    expect(screen.queryByText(/^##/)).not.toBeInTheDocument();
  });

  it('renders **bold** as strong text without the literal asterisks', () => {
    render(<div>{renderMessageMarkdown('This is **important** to know.')}</div>);
    expect(screen.getByText('important').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('renders `inline code` as a code element without the literal backticks', () => {
    render(<div>{renderMessageMarkdown('Run `npm install` first.')}</div>);
    expect(screen.getByText('npm install').tagName).toBe('CODE');
  });

  it('renders a safe [text](https://...) link as a real anchor', () => {
    render(<div>{renderMessageMarkdown('See [the form](https://example.org/form).')}</div>);
    const link = screen.getByRole('link', { name: 'the form' });
    expect(link).toHaveAttribute('href', 'https://example.org/form');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders a mailto: link as a real anchor', () => {
    render(<div>{renderMessageMarkdown('Email [support](mailto:help@example.org).')}</div>);
    expect(screen.getByRole('link', { name: 'support' })).toHaveAttribute(
      'href',
      'mailto:help@example.org',
    );
  });

  it('never turns an unsafe-scheme link into a clickable anchor', () => {
    render(<div>{renderMessageMarkdown('[click me](javascript:alert(1))')}</div>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('[click me](javascript:alert(1))')).toBeInTheDocument();
  });

  it('renders plain prose with no markdown unchanged', () => {
    render(<div>{renderMessageMarkdown('Just a normal sentence.')}</div>);
    expect(screen.getByText('Just a normal sentence.')).toBeInTheDocument();
  });

  it('never partially consumes a fenced code block as a stray inline code span', () => {
    const { container } = render(<div>{renderMessageMarkdown('```\nconst x = 1;\n```')}</div>);
    expect(container.querySelector('code')).not.toBeInTheDocument();
    expect(screen.getByText(/```/)).toBeInTheDocument();
  });

  it('leaves unsupported constructs (fenced code, blockquotes) as visible plain text rather than crashing', () => {
    render(
      <div>
        {renderMessageMarkdown('> a quoted line\n```\nconst x = 1;\n```')}
      </div>,
    );
    expect(screen.getByText(/a quoted line/)).toBeInTheDocument();
    expect(screen.getByText(/const x = 1;/)).toBeInTheDocument();
  });
});
