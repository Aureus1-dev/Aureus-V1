const redirect = jest.fn();
jest.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));
jest.mock('../../../design-system/components/pods', () => ({ PodsPage: () => null }));

import PodsPage from './page';

describe('PodsPage', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /home (C2 — Pods is cut for V1, not just hidden from nav)', () => {
    PodsPage();
    expect(redirect).toHaveBeenCalledWith('/home');
  });
});
