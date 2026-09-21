import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RecipeInterpreter } from '../application/recipe-interpreter.js';
import type {
  InterpreterInput,
  RawRecipeProposal,
} from '../domain/import-proposal.js';
import {
  recipeInterpretationInstruction,
  recipeResponseSchema,
} from './recipe-response-schema.js';

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function toGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'additionalProperties') continue;
    if (key === 'type' && Array.isArray(item)) {
      result.type = item.find((type) => type !== 'null');
      result.nullable = item.includes('null');
      continue;
    }
    result[key] = toGeminiSchema(item);
  }
  return result;
}

const geminiRecipeResponseSchema = toGeminiSchema(recipeResponseSchema);

@Injectable()
export class GeminiRecipeInterpreter implements RecipeInterpreter {
  async interpret(input: InterpreterInput): Promise<RawRecipeProposal> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey)
      throw new ServiceUnavailableException(
        'La importación con IA no está configurada',
      );

    const model = process.env['GEMINI_IMPORT_MODEL'] ?? 'gemini-3.5-flash-lite';
    const body = {
      systemInstruction: {
        parts: [{ text: recipeInterpretationInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: this.parts(input),
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiRecipeResponseSchema,
      },
    };

    const response = await this.request(apiKey, model, body, true);
    const output = response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('');
    if (!output)
      throw new BadGatewayException(
        'El proveedor devolvió una respuesta vacía',
      );
    try {
      return JSON.parse(output) as RawRecipeProposal;
    } catch {
      throw new BadGatewayException(
        'El proveedor devolvió una respuesta inválida',
      );
    }
  }

  private parts(input: InterpreterInput) {
    const prompt = {
      text: 'Extrae la receta de esta fuente y devuelve únicamente la estructura solicitada.',
    };
    if (input.kind === 'text') return [prompt, { text: input.text }];
    return [
      prompt,
      {
        inlineData: {
          mimeType: input.kind === 'image' ? input.mimeType : 'application/pdf',
          data: input.dataBase64,
        },
      },
    ];
  }

  private async request(
    apiKey: string,
    model: string,
    body: object,
    allowRetry: boolean,
  ): Promise<GeminiResponse> {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        },
      );
    } catch {
      if (allowRetry) return this.request(apiKey, model, body, false);
      throw new BadGatewayException('No se pudo contactar con el proveedor');
    }
    if (!response.ok) {
      if (allowRetry && (response.status === 429 || response.status >= 500)) {
        return this.request(apiKey, model, body, false);
      }
      throw new BadGatewayException('El proveedor no pudo procesar la fuente');
    }
    return (await response.json()) as GeminiResponse;
  }
}
