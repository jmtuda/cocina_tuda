import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiRecipeInterpreter } from './gemini-recipe-interpreter.js';

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
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status },
  );

describe('GeminiRecipeInterpreter', () => {
  afterEach(() => {
    delete process.env['GEMINI_API_KEY'];
    delete process.env['GEMINI_IMPORT_MODEL'];
    vi.unstubAllGlobals();
  });

  it('requires explicit provider configuration', async () => {
    await expect(
      new GeminiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('requests structured output and parses a valid image proposal', async () => {
    process.env['GEMINI_API_KEY'] = 'test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(valid));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new GeminiRecipeInterpreter().interpret({
      kind: 'image',
      mimeType: 'image/png',
      dataBase64: 'aW1hZ2U=',
    });
    expect(result.name).toBe('Sopa');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('gemini-3.5-flash-lite');
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe('string');
    const request = JSON.parse(requestBody as string) as {
      generationConfig: {
        responseMimeType: string;
        responseSchema: {
          type: string;
          additionalProperties?: boolean;
          properties: { name: { type: string; nullable: boolean } };
        };
      };
      contents: Array<{
        parts: Array<{ text?: string; inlineData?: { mimeType: string } }>;
      }>;
    };
    expect(request.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: { name: { type: 'string', nullable: true } },
      },
    });
    expect(
      request.generationConfig.responseSchema.additionalProperties,
    ).toBeUndefined();
    expect(request.contents[0]?.parts[1]?.inlineData?.mimeType).toBe(
      'image/png',
    );
  });

  it('passes PDFs inline without permanent provider file storage', async () => {
    process.env['GEMINI_API_KEY'] = 'test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(valid));
    vi.stubGlobal('fetch', fetchMock);
    await new GeminiRecipeInterpreter().interpret({
      kind: 'file',
      filename: 'receta.pdf',
      mimeType: 'application/pdf',
      dataBase64: 'cGRm',
    });
    const request = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    ) as {
      contents: Array<{
        parts: Array<{ inlineData?: { mimeType: string; data: string } }>;
      }>;
    };
    expect(request.contents[0]?.parts[1]?.inlineData).toEqual({
      mimeType: 'application/pdf',
      data: 'cGRm',
    });
  });

  it('retries a transient provider failure only once', async () => {
    process.env['GEMINI_API_KEY'] = 'test-key';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(response(valid));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new GeminiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).resolves.toMatchObject({ name: 'Sopa' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid provider output', async () => {
    process.env['GEMINI_API_KEY'] = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(response('{')),
    );
    await expect(
      new GeminiRecipeInterpreter().interpret({ kind: 'text', text: 'Sopa' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
