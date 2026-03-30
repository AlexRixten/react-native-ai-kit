/**
 * Parse content from OpenAI-style streaming response.
 *
 * @example
 * ```ts
 * parseContent({ choices: [{ delta: { content: 'Hello' } }] })
 * // => 'Hello'
 * ```
 */
export function parseContent(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const choices = record.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const delta = (choices[0] as Record<string, unknown>)?.delta;
  if (typeof delta !== 'object' || delta === null) {
    return null;
  }

  const content = (delta as Record<string, unknown>).content;
  if (typeof content !== 'string') {
    return null;
  }

  return content;
}
