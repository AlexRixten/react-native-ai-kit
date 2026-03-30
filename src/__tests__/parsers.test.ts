import { parseContent } from '../parsers/parseContent';
import { extractTokenUsage } from '../parsers/extractTokenUsage';
import { extractJSON } from '../parsers/extractJSON';
import { extractToolCalls } from '../parsers/extractToolCalls';
import { extractReasoning } from '../parsers/extractReasoning';

// --- parseContent ---

describe('parseContent', () => {
  it('extracts content from OpenAI-style delta response', () => {
    const data = {
      choices: [{ delta: { content: 'Hello world' } }],
    };
    expect(parseContent(data)).toBe('Hello world');
  });

  it('returns null when choices is empty array', () => {
    const data = { choices: [] };
    expect(parseContent(data)).toBeNull();
  });

  it('returns null when choices is missing', () => {
    const data = { foo: 'bar' };
    expect(parseContent(data)).toBeNull();
  });

  it('returns null when content is not a string', () => {
    const data = {
      choices: [{ delta: { content: 123 } }],
    };
    expect(parseContent(data)).toBeNull();
  });

  it('returns null when delta is missing', () => {
    const data = {
      choices: [{ finish_reason: 'stop' }],
    };
    expect(parseContent(data)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseContent(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseContent('string')).toBeNull();
    expect(parseContent(42)).toBeNull();
  });

  it('returns null for empty string content', () => {
    const data = {
      choices: [{ delta: { content: '' } }],
    };
    expect(parseContent(data)).toBe('');
  });
});

// --- extractTokenUsage ---

describe('extractTokenUsage', () => {
  it('extracts all token fields', () => {
    const data = {
      usage: {
        prompt_tokens: 24,
        completion_tokens: 20,
        total_tokens: 44,
      },
    };
    expect(extractTokenUsage(data)).toEqual({
      promptTokens: 24,
      completionTokens: 20,
      totalTokens: 44,
    });
  });

  it('extracts with partial fields (only total_tokens)', () => {
    const data = {
      usage: { total_tokens: 100 },
    };
    expect(extractTokenUsage(data)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 100,
    });
  });

  it('returns null when usage is missing', () => {
    expect(extractTokenUsage({ foo: 'bar' })).toBeNull();
  });

  it('returns null when total_tokens is missing', () => {
    const data = { usage: { prompt_tokens: 10 } };
    expect(extractTokenUsage(data)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractTokenUsage(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(extractTokenUsage('string')).toBeNull();
    expect(extractTokenUsage(42)).toBeNull();
  });

  it('returns null when usage is not an object', () => {
    expect(extractTokenUsage({ usage: 'not an object' })).toBeNull();
  });
});

// --- extractJSON ---

describe('extractJSON', () => {
  it('extracts JSON from fenced code block', () => {
    const text =
      'Here is the data:\n```json\n{"name": "Aspirin"}\n```\nTake it.';
    expect(extractJSON(text)).toEqual({ name: 'Aspirin' });
  });

  it('extracts JSON from code block without json tag', () => {
    const text = 'Result:\n```\n{"count": 5}\n```';
    expect(extractJSON(text)).toEqual({ count: 5 });
  });

  it('extracts raw JSON from text', () => {
    const text = 'The result is {"score": 0.95} which is high.';
    expect(extractJSON(text)).toEqual({ score: 0.95 });
  });

  it('returns null when no JSON found', () => {
    expect(extractJSON('No JSON here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJSON('')).toBeNull();
  });

  it('handles nested JSON', () => {
    const text = '```json\n{"user": {"name": "Alex", "age": 30}}\n```';
    expect(extractJSON(text)).toEqual({
      user: { name: 'Alex', age: 30 },
    });
  });

  it('handles JSON array', () => {
    const text = '```json\n["a", "b", "c"]\n```';
    expect(extractJSON(text)).toEqual(['a', 'b', 'c']);
  });

  it('returns null for invalid JSON in code block', () => {
    const text = '```json\nnot valid json\n```';
    // Falls through to raw JSON attempt
    expect(extractJSON(text)).toBeNull();
  });
});

// --- extractToolCalls ---

describe('extractToolCalls', () => {
  it('extracts tool calls from OpenAI response object', () => {
    const data = {
      tool_calls: [
        {
          type: 'function',
          function: {
            name: 'search',
            arguments: '{"query": "dose"}',
          },
        },
      ],
    };
    expect(extractToolCalls(data)).toEqual([
      {
        type: 'function',
        name: 'search',
        input: { query: 'dose' },
      },
    ]);
  });

  it('extracts multiple tool calls', () => {
    const data = {
      tool_calls: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"city": "London"}',
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_time',
            arguments: '{"timezone": "UTC"}',
          },
        },
      ],
    };
    const calls = extractToolCalls(data);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.name).toBe('get_weather');
    expect(calls[1]!.name).toBe('get_time');
  });

  it('returns empty array when tool_calls is missing', () => {
    expect(extractToolCalls({ foo: 'bar' })).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(extractToolCalls(null)).toEqual([]);
  });

  it('returns empty array for non-object', () => {
    expect(extractToolCalls('string')).toEqual([]);
  });

  it('extracts from JSON string', () => {
    const str = JSON.stringify([
      {
        type: 'function',
        function: {
          name: 'calculate',
          arguments: '{"a": 1, "b": 2}',
        },
      },
    ]);
    expect(extractToolCalls(str)).toEqual([
      {
        type: 'function',
        name: 'calculate',
        input: { a: 1, b: 2 },
      },
    ]);
  });

  it('handles already-parsed arguments (object)', () => {
    const data = {
      tool_calls: [
        {
          type: 'function',
          function: {
            name: 'search',
            arguments: { query: 'test' },
          },
        },
      ],
    };
    expect(extractToolCalls(data)).toEqual([
      {
        type: 'function',
        name: 'search',
        input: { query: 'test' },
      },
    ]);
  });
});

// --- extractReasoning ---

describe('extractReasoning', () => {
  it('extracts DeepSeek-style think tags', () => {
    const text =
      '<think source="internal">Need to calculate...\n</think >The answer is 42.';
    expect(extractReasoning(text)).toEqual({
      reasoning: 'Need to calculate...',
      content: 'The answer is 42.',
    });
  });

  it('extracts reasoning tags', () => {
    const text =
      '<reasoning>Step 1: parse input\nStep 2: compute</reasoning>Result: 100';
    expect(extractReasoning(text)).toEqual({
      reasoning: 'Step 1: parse input\nStep 2: compute',
      content: 'Result: 100',
    });
  });

  it('extracts thought tags', () => {
    const text = '<thought>Let me think...</thought>Final answer.';
    expect(extractReasoning(text)).toEqual({
      reasoning: 'Let me think...',
      content: 'Final answer.',
    });
  });

  it('returns empty reasoning when no tags found', () => {
    const text = 'Just a regular response.';
    expect(extractReasoning(text)).toEqual({
      reasoning: '',
      content: 'Just a regular response.',
    });
  });

  it('handles text with only reasoning', () => {
    const text = '<think source="internal">Thinking only</think >';
    expect(extractReasoning(text)).toEqual({
      reasoning: 'Thinking only',
      content: '',
    });
  });

  it('is case insensitive', () => {
    const text = '<THINK>thinking</THINK>content';
    expect(extractReasoning(text)).toEqual({
      reasoning: 'thinking',
      content: 'content',
    });
  });
});
