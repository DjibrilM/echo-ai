import { z } from 'zod';

/**
 * Character-wise scan that tracks string literals and brace depth to locate
 * balanced top-level JSON objects without being corrupted by braces inside strings.
 */
export function getBalancedJsonObjectSpans(rawText: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const stack: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < rawText.length; i++) {
    const ch = rawText[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      stack.push(i);
    } else if (ch === '}') {
      if (stack.length > 0) {
        const start = stack.pop()!;
        if (stack.length === 0) {
          spans.push([start, i + 1]);
        }
      }
    }
  }

  return spans;
}

/**
 * Cleans common LLM formatting defects from JSON strings:
 * - Trailing commas in arrays and objects
 * - Control characters
 */
export function sanitizeJsonString(jsonStr: string): string {
  return jsonStr
    // Remove trailing commas before closing braces or brackets
    .replace(/,\s*([}\]])/g, '$1')
    // Remove non-standard whitespace/control characters if needed
    .trim();
}

/**
 * Extracts and parses a JSON object from raw model output.
 * Handles markdown fences, preamble conversation, and nested braces.
 * Optionally validates the parsed output against a Zod schema.
 */
export function extractStructuredJson<T = unknown>(
  rawText: string,
  schema?: z.ZodType<T>,
): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Cannot extract JSON from empty or non-string input');
  }

  // 1. Try markdown code block extraction
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = sanitizeJsonString(codeBlockMatch[1]);
    try {
      const parsed = JSON.parse(candidate);
      if (schema) {
        return schema.parse(parsed);
      }
      return parsed as T;
    } catch {
      // Fall through to balanced brace extraction
    }
  }

  // 2. Character-wise balanced brace extraction
  const spans = getBalancedJsonObjectSpans(rawText);
  if (spans.length > 0) {
    // Try the largest span or the first span
    for (let i = spans.length - 1; i >= 0; i--) {
      const [start, end] = spans[i];
      const slice = sanitizeJsonString(rawText.slice(start, end));
      try {
        const parsed = JSON.parse(slice);
        if (schema) {
          return schema.parse(parsed);
        }
        return parsed as T;
      } catch {
        // Try earlier spans
      }
    }
  }

  // 3. Fallback: simple indexOf start and lastIndexOf end
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = sanitizeJsonString(rawText.slice(firstBrace, lastBrace + 1));
    try {
      const parsed = JSON.parse(slice);
      if (schema) {
        return schema.parse(parsed);
      }
      return parsed as T;
    } catch (parseErr: any) {
      throw new Error(
        `Failed to parse extracted JSON slice: ${parseErr.message}\nExtracted snippet: ${slice.slice(0, 300)}...`,
      );
    }
  }

  throw new Error(`No valid JSON structure found in output:\n${rawText.slice(0, 400)}...`);
}

