/**
 * Extract reasoning (chain-of-thought) from AI response,
 * separating it from the main content.
 *
 * Supports common formats:
 * - `<think source="internal">...</think >` (DeepSeek style)
 * - `<reasoning>...</reasoning>`
 * - `<thought>...</thought>`
 *
 * @example
 * ```ts
 * extractReasoning('<think source="internal">Need to calculate...\n</think >The answer is 42.')
 * // => { reasoning: 'Need to calculate...', content: 'The answer is 42.' }
 * ```
 */
export function extractReasoning(text: string): {
  reasoning: string;
  content: string;
} {
  const patterns = [
    /<think[^>]*>([\s\S]*?)<\/think\s*>/i,
    /<reasoning>([\s\S]*?)<\/reasoning>/i,
    /<thought>([\s\S]*?)<\/thought>/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const reasoning = (match[1] ?? '').trim();
      const content = text.replace(pattern, '').trim();
      return { reasoning, content };
    }
  }

  return { reasoning: '', content: text };
}
