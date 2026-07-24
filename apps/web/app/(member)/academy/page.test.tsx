const redirect = jest.fn();
jest.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));
jest.mock('../../../design-system/components/academy', () => ({ AcademyCenter: () => null }));

import AcademyPage from './page';

describe('AcademyPage', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /home (C2 — Academy is cut for V1, not just hidden from nav)', () => {
    AcademyPage();
    expect(redirect).toHaveBeenCalledWith('/home');
  });
});
