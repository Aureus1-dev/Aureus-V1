import sanitizeHtml from 'sanitize-html';

/**
 * Strips all markup from user-authored free text before it is persisted
 * (PD-001). No current surface renders this content as raw HTML — React
 * escapes by default — but stored content is consumed by more than one
 * client over the life of the platform, and this closes that stored-XSS
 * class of risk at the source rather than relying on every future renderer
 * to escape correctly. These fields are plain text, not rich text, so
 * everything is stripped rather than allow-listed.
 */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
