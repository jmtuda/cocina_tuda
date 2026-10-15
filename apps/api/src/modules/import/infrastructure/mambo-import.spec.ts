import 'reflect-metadata';
import { BadGatewayException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmImportDto } from '../presentation/import.dto.js';
import { OpenAiRecipeInterpreter } from './openai-recipe-interpreter.js';
import { GeminiRecipeInterpreter } from './gemini-recipe-interpreter.js';
import {
  recipeInterpretationInstruction,
  recipeResponseSchema,
} from './recipe-response-schema.js';

const base = {
  name: 'Sopa',
  description: null,
  author: null,
  servings: null,
  difficulty: null,
  notes: null,
  ingredients: [],
  categories: [],
  tags: [],
};
const mambo = {
  speed: 1,
  temperature: 100,
  ct: 6,
  durationSeconds: 240,
  observations: null,
};
const invalidSteps: unknown[] = [
  null,
  12,
  [],
  {},
  { text: 4 },
  { text: 'Cocinar', mambo: [] },
  { text: 'Cocinar', mambo: '1' },
  ...['speed', 'temperature', 'ct', 'durationSeconds'].flatMap((field) =>
    [-1, 1.5, 2147483648, '0', true].map((value) => ({
      text: 'Cocinar',
      mambo: { [field]: value },
    })),
  ),
  { text: 'Cocinar', mambo: { observations: 1 } },
  { text: 'Cocinar', mambo: { unknown: 2 } },
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.each([
  {
    name: 'OpenAI',
    key: 'OPENAI_API_KEY',
    create: () => new OpenAiRecipeInterpreter(),
    envelope: (text: string) => ({
      output: [{ content: [{ type: 'output_text', text }] }],
    }),
  },
  {
    name: 'Gemini',
    key: 'GEMINI_API_KEY',
    create: () => new GeminiRecipeInterpreter(),
    envelope: (text: string) => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  },
])('$name Mambo import', ({ key, create, envelope }) => {
  function mock(value: unknown) {
    vi.stubEnv(key, 'test-only');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(envelope(JSON.stringify(value)))),
      );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }
  it('preserves configs, explicit zeros, nullable fields and legacy strings without rewriting source', async () => {
    const steps = [
      { text: 'Cocinar', mambo },
      {
        text: 'Reposar',
        mambo: {
          speed: 0,
          temperature: 0,
          ct: 0,
          durationSeconds: 0,
          observations: 'Sin calor',
        },
      },
      { text: 'Servir', mambo: null },
      'Paso antiguo',
      { text: 'Otro', mambo: { temperature: null } },
    ];
    const proposal = { ...base, steps, issues: ['Tiempo ambiguo: revisar'] };
    const fetchMock = mock(proposal);
    expect(
      await create().interpret({
        kind: 'text',
        text: 'Cocinar\nVel.:1/// Temp.:100/// CT:6/// Tiempo:4m',
      }),
    ).toEqual(proposal);
    const request: unknown = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    );
    expect(JSON.stringify(request)).toContain('durationSeconds');
    expect(JSON.stringify(request)).toContain('2147483647');
    expect(JSON.stringify(request)).toContain('durationSeconds=240');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(invalidSteps.map((step) => [step]))(
    'rejects unsafe step %j',
    async (step) => {
      mock({ ...base, steps: [step] });
      await expect(
        create().interpret({ kind: 'text', text: 'source' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    },
  );
  it.each([
    null,
    [],
    { name: 'Incomplete' },
    { ...base, steps: [], issues: [42] },
  ])('rejects malformed proposal %j', async (proposal) => {
    mock(proposal);
    await expect(
      create().interpret({ kind: 'text', text: 'source' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
  it.each(['null', '{', '{"output":3,"candidates":[{"content":{"parts":3}}]}'])(
    'rejects malformed envelope %s safely',
    async (body) => {
      vi.stubEnv(key, 'test-only');
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>().mockResolvedValue(new Response(body)),
      );
      await expect(
        create().interpret({ kind: 'text', text: 'source' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    },
  );
});

describe('import confirmation validation and strict schema', () => {
  const dto = (steps: unknown) =>
    plainToInstance(ConfirmImportDto, {
      importId: '00000000-0000-4000-8000-000000000001',
      name: 'Sopa',
      steps,
      ingredients: [],
      categories: [],
      tags: [],
    });
  it('allows mixed old/new steps and explicit config removal through whitelist validation', () => {
    const input = dto([
      'Antiguo',
      { text: 'Cocinar', mambo },
      { text: 'Servir', mambo: null },
      { text: 'Reposar', mambo: { speed: 0 } },
      { text: 'Sin config' },
    ]);
    expect(
      validateSync(input, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(input.steps[1]).toEqual({ text: 'Cocinar', mambo });
  });
  it.each(invalidSteps.map((step) => [step]))(
    'rejects invalid nested confirmation %j',
    (step) => {
      expect(
        validateSync(dto([step]), {
          whitelist: true,
          forbidNonWhitelisted: true,
        }).length,
      ).toBeGreaterThan(0);
    },
  );
  it('requires every property in each strict output object and all nullable Mambo fields', () => {
    function check(schema: unknown) {
      if (!schema || typeof schema !== 'object') return;
      const node = schema as {
        type?: unknown;
        properties?: Record<string, unknown>;
        required?: string[];
        additionalProperties?: boolean;
      };
      if (node.properties) {
        expect(node.additionalProperties).toBe(false);
        expect([...(node.required ?? [])].sort()).toEqual(
          Object.keys(node.properties).sort(),
        );
      }
      Object.values(node).forEach((value: unknown) => {
        if (Array.isArray(value)) value.forEach(check);
        else check(value);
      });
    }
    check(recipeResponseSchema);
    expect(
      recipeResponseSchema.properties.steps.items.properties.mambo.properties
        .speed,
    ).toEqual({ type: ['integer', 'null'], minimum: 0, maximum: 2147483647 });
    expect(recipeInterpretationInstruction).toContain(
      'no las numeres como un paso separado',
    );
    expect(recipeInterpretationInstruction).toContain(
      'cero no significa ausente',
    );
    expect(recipeInterpretationInstruction).toContain('issues');
  });
});
