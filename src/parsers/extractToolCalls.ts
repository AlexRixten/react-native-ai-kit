import type { ToolCall } from '../types';

/**
 * Extract function calling (tool calls) data from an AI response.
 *
 * Works with OpenAI-style tool_calls array in the response object,
 * or with raw JSON array of tool calls in the text.
 *
 * @example
 * ```ts
 * // From parsed response object:
 * extractToolCalls({
 *   tool_calls: [{ type: 'function', function: { name: 'search', arguments: '{"q":"dose"}' } }]
 * })
 * // => [{ type: 'function', name: 'search', input: { q: 'dose' } }]
 *
 * // From text:
 * extractToolCalls('[{"type":"function","function":{"name":"search","arguments":"{\\"q\\":\\"dose\\"}"}}]')
 * // => [{ type: 'function', name: 'search', input: { q: 'dose' } }]
 * ```
 */
function parseToolCallArray(arr: unknown[]): ToolCall[] {
  return arr.map((tc: unknown) => {
    const tcRecord = tc as Record<string, unknown>;
    const fn = (tcRecord.function || tcRecord) as Record<string, unknown>;
    const args =
      typeof fn.arguments === 'string'
        ? JSON.parse(fn.arguments as string)
        : fn.arguments;

    return {
      type: String(tcRecord.type || 'function'),
      name: String(fn.name || ''),
      input: (args || {}) as Record<string, unknown>,
    };
  });
}

export function extractToolCalls(data: unknown): ToolCall[] {
  // Case 1: OpenAI-style response object with tool_calls
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.tool_calls)) {
      return parseToolCallArray(record.tool_calls);
    }

    // Case 2: Direct array of tool calls
    if (Array.isArray(data)) {
      return parseToolCallArray(data);
    }
  }

  // Case 3: Raw JSON string with array of tool calls
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parseToolCallArray(parsed);
      }
    } catch {
      // Not valid JSON
    }
  }

  return [];
}
