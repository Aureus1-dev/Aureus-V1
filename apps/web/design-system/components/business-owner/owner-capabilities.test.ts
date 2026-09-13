import { capabilitiesForRole } from './owner-capabilities';

describe('owner capabilities mirror the server role sets', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER'])(
    '%s may change work state and manage completion',
    (role) => {
      expect(capabilitiesForRole(role)).toEqual({
        canChangeWorkState: true,
        canManageCompletion: true,
      });
    },
  );

  it('OPERATOR may move work but may not complete or cancel', () => {
    expect(capabilitiesForRole('OPERATOR')).toEqual({
      canChangeWorkState: true,
      canManageCompletion: false,
    });
  });

  it.each(['VIEWER', 'MEMBER'])('%s receives no management controls', (role) => {
    expect(capabilitiesForRole(role)).toEqual({
      canChangeWorkState: false,
      canManageCompletion: false,
    });
  });

  it('grants nothing when the role is unknown or unavailable', () => {
    // A failed role lookup must never widen capability.
    expect(capabilitiesForRole(null)).toEqual({
      canChangeWorkState: false,
      canManageCompletion: false,
    });
    expect(capabilitiesForRole(undefined)).toEqual({
      canChangeWorkState: false,
      canManageCompletion: false,
    });
    expect(capabilitiesForRole('SOMETHING_ELSE')).toEqual({
      canChangeWorkState: false,
      canManageCompletion: false,
    });
  });
});
