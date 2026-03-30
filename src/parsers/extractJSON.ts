/**
 * Extract a JSON block from AI response text.
 *
 * Supports both fenced code blocks and raw JSON in the response.
 *
 * @example
 * ```ts
 * extractJSON('Here is the data:\n```json\n{"name": "Aspirin"}\n```\nTake it.')
 * // => { name: 'Aspirin' }
 * ```
 */
export function extractJSON(text: string): unknown | null {
  // Try fenced code block first: ```json ... ```
  const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1]?.trim() ?? '');
    } catch {
      // Fall through to raw JSON attempt
    }
  }

  // Try raw JSON anywhere in the text
  const rawMatch = text.match(/\{[\s\S]*\}/);
  if (rawMatch) {
    try {
      return JSON.parse(rawMatch[0] ?? '');
    } catch {
      return null;
    }
  }

  return null;
}
