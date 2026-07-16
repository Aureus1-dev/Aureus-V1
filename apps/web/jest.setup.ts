import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jsdom does not implement scrollIntoView (used by LiveTranscript's
// auto-scroll-to-latest-turn behavior). A no-op is sufficient for tests,
// which assert on rendered content, not scroll position.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}
