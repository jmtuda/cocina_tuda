import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiRecipeInterpreter } from './openai-recipe-interpreter.js';

const valid = JSON.stringify({
  name: 'Sopa',
  description: null,
  author: null,
  servings: null,
  difficulty: null,
  notes: null,
  steps: [],
  ingredients: [],
  categories: [],
  tags: [],
});

const response = (text: string, status = 200) =>
  new Response(
    JSON.stringify({
      output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
    }),
    { status },
  );

describe('OpenAiRecipeInterpreter', () => {
  afterEach(() => {
    delete process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_IMPORT_MODEL'];
    vi.unstubAllGlobals();
  });

  it('requires explicit provider configuration', async () => {
    await expect(
      new OpenAiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses stateless structured output and parses a valid proposal', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(valid));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new OpenAiRecipeInterpreter().interpret({
      kind: 'image',
      mimeType: 'image/png',
      dataBase64: 'aW1hZ2U=',
    });
    expect(result.name).toBe('Sopa');
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe('string');
    const request = JSON.parse(requestBody as string) as {
      store: boolean;
      text: { format: { type: string; strict: boolean } };
      input: Array<{ content: Array<{ type: string }> }>;
    };
    expect(request.store).toBe(false);
    expect(request.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
    });
    expect(request.input[0]?.content[1]?.type).toBe('input_image');
  });

  it('retries a transient provider failure only once', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(response(valid));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new OpenAiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).resolves.toMatchObject({ name: 'Sopa' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid provider output', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(response('{')),
    );
    await expect(
      new OpenAiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
