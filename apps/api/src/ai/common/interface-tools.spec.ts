import { INTERFACE_ALLOWED_ROUTES, INTERFACE_TOOL_SPECS } from './interface-tools';
import { V1_FEATURE_FLAGS } from '../../config/v1-feature-scope';

describe('INTERFACE_ALLOWED_ROUTES', () => {
  it('excludes academy while V1_FEATURE_FLAGS.academy is off (C2 — no navigate_to_route bypass)', () => {
    expect(V1_FEATURE_FLAGS.academy).toBe(false);
    expect(INTERFACE_ALLOWED_ROUTES).not.toContain('academy');
  });

  it('still allows the launch-scope routes', () => {
    expect(INTERFACE_ALLOWED_ROUTES).toEqual(
      expect.arrayContaining(['home', 'journey', 'opportunities', 'conversation', 'welcome']),
    );
  });

  it('the navigate_to_route tool spec enum matches INTERFACE_ALLOWED_ROUTES exactly', () => {
    const navigateSpec = INTERFACE_TOOL_SPECS.find((spec) => spec.name === 'navigate_to_route');
    const properties = navigateSpec?.parameters.properties as
      | { route?: { enum?: readonly string[] } }
      | undefined;
    expect(properties?.route?.enum).toEqual(INTERFACE_ALLOWED_ROUTES);
  });
});
