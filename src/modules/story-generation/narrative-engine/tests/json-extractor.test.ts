import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  extractStructuredJson,
  getBalancedJsonObjectSpans,
  sanitizeJsonString,
} from '../model/json-extractor.ts';

test('JSON Extractor: extracts pure JSON object', () => {
  const input = '{"title": "The Signal", "count": 42}';
  const result = extractStructuredJson(input);
  assert.deepEqual(result, { title: 'The Signal', count: 42 });
});

test('JSON Extractor: handles markdown code blocks and preamble text', () => {
  const input = `Here is your requested narrative blueprint:
\`\`\`json
{
  "name": "Epsilon-9",
  "active": true
}
\`\`\`
I hope this meets your criteria!`;

  const schema = z.object({
    name: z.string(),
    active: z.boolean(),
  });

  const result = extractStructuredJson(input, schema);
  assert.equal(result.name, 'Epsilon-9');
  assert.equal(result.active, true);
});

test('JSON Extractor: cleans trailing commas from objects and arrays', () => {
  const input = `{
    "items": ["alpha", "beta",],
    "nested": {
      "key": "value",
    },
  }`;

  const cleaned = sanitizeJsonString(input);
  const parsed = JSON.parse(cleaned);
  assert.deepEqual(parsed.items, ['alpha', 'beta']);
  assert.equal(parsed.nested.key, 'value');
});

test('JSON Extractor: protects nested braces inside string literals', () => {
  const rawWithCodeSnippet = `
{
  "scene": "The Vault",
  "prose": "Doyle adjusted the coil. {static crackled} It sounded like a whispered {message} from deep space.",
  "codeSnippet": "function test() { try { doWork(); } catch (e) { return {}; } }"
}`;

  const spans = getBalancedJsonObjectSpans(rawWithCodeSnippet);
  assert.equal(spans.length, 1);

  const result: any = extractStructuredJson(rawWithCodeSnippet);
  assert.equal(result.scene, 'The Vault');
  assert.ok(result.prose.includes('{static crackled}'));
  assert.ok(result.codeSnippet.includes('catch (e) { return {}; }'));
});

test('JSON Extractor: throws informative error if schema validation fails', () => {
  const input = '{"name": 123}';
  const schema = z.object({ name: z.string() });

  assert.throws(() => {
    extractStructuredJson(input, schema);
  });
});

