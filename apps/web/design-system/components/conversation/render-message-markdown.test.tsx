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

  it('renders plain prose with no markdown unchanged', () => {
    render(<div>{renderMessageMarkdown('Just a normal sentence.')}</div>);
    expect(screen.getByText('Just a normal sentence.')).toBeInTheDocument();
  });
});
