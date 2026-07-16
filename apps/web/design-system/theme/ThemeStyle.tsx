import { buildThemeCss } from './build-theme-css';

/**
 * Server-rendered token stylesheet. Rendering this in the root layout
 * means every token-derived CSS variable is available before hydration,
 * with no flash of unstyled content and no client JS required for the
 * base theme.
 */
export function ThemeStyle() {
  return <style id="aureus-tokens" dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />;
}
