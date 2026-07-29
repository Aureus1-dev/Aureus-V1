import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { DocumentDto } from '../../../lib/api/documents';
import { DocumentViewer } from './DocumentViewer';

const baseDocument: DocumentDto = {
  id: 'doc-1',
  documentRef: 'AUR-DOC-000001',
  userId: 'member-1',
  title: 'Lease Agreement',
  originalFilename: 'lease.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 204800,
  storageRef: 'storage/doc-1',
  category: 'LEASE',
  extractedText: 'This lease agreement is entered into between...',
  aiSummary: 'A one-year residential lease.',
  aiSummaryGeneratedAt: 'x',
  uploadedAt: 'x',
  updatedAt: 'x',
};

describe('DocumentViewer', () => {
  it('renders the shared metadata/summary header and the full extracted text', () => {
    render(<DocumentViewer document={baseDocument} />);
    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    expect(screen.getByText('A one-year residential lease.')).toBeInTheDocument();
    expect(screen.getByText('This lease agreement is entered into between...')).toBeInTheDocument();
  });

  it('renders no text region when the document has no extracted text yet', () => {
    render(<DocumentViewer document={{ ...baseDocument, extractedText: null, aiSummary: null }} />);
    expect(screen.queryByText('Full text')).not.toBeInTheDocument();
  });

  it('calls onClose without navigating away', async () => {
    const onClose = jest.fn();
    render(<DocumentViewer document={baseDocument} onClose={onClose} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DocumentViewer document={baseDocument} onClose={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
