import type { TokenUsage } from '../types';

/**
 * Extract token usage from response.
 *
 * @example
 * ```ts
 * extractTokenUsage({ usage: { prompt_tokens: 24, completion_tokens: 20, total_tokens: 44 } })
 * // => { promptTokens: 24, completionTokens: 20, totalTokens: 44 }
 * ```
 */
export function extractTokenUsage(data: unknown): TokenUsage | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  if (
    'usage' in data &&
    typeof data.usage === 'object' &&
    data.usage !== null
  ) {
    const usage = data.usage as Record<string, unknown>;

    const promptTokens =
      typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined;
    const completionTokens =
      typeof usage.completion_tokens === 'number'
        ? usage.completion_tokens
        : undefined;
    const totalTokens =
      typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined;

    if (totalTokens !== undefined) {
      return {
        promptTokens: promptTokens ?? 0,
        completionTokens: completionTokens ?? 0,
        totalTokens,
      };
    }
  }

  return null;
}
