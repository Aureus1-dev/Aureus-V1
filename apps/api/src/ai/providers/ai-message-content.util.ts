import type {
  AiImageContentPart,
  AiMessageContent,
} from './ai-provider.interface';

export function textFromAiContent(content: AiMessageContent): string {
  if (typeof content === 'string') return content;
  return content
    .filter((part): part is Extract<(typeof content)[number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

export function imagePartsFromAiContent(content: AiMessageContent): AiImageContentPart[] {
  if (typeof content === 'string') return [];
  return content.filter(
    (part): part is AiImageContentPart => part.type === 'image',
  );
}

export function mapTextInAiContent(
  content: AiMessageContent,
  transform: (value: string) => string,
): AiMessageContent {
  if (typeof content === 'string') return transform(content);
  return content.map((part) =>
    part.type === 'text' ? { ...part, text: transform(part.text) } : part,
  );
}

export function approximateAiContentCharacters(content: AiMessageContent): number {
  const textLength = textFromAiContent(content).length;
  const imageCount = imagePartsFromAiContent(content).length;
  // Stub/CI accounting only. Real providers return authoritative usage.
  return textLength + imageCount * 4000;
}
