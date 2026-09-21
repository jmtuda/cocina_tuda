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

type OpenAiResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

@Injectable()
export class OpenAiRecipeInterpreter implements RecipeInterpreter {
  async interpret(input: InterpreterInput): Promise<RawRecipeProposal> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey)
      throw new ServiceUnavailableException(
        'La importación con IA no está configurada',
      );

    const body = {
      model: process.env['OPENAI_IMPORT_MODEL'] ?? 'gpt-5.4-mini',
      store: false,
      instructions: recipeInterpretationInstruction,
      input: [
        {
          role: 'user',
          content: this.content(input),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'recipe_proposal',
          strict: true,
          schema: recipeResponseSchema,
        },
      },
    };

    const response = await this.request(apiKey, body, true);
    const output = response.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === 'output_text')?.text;
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

  private content(input: InterpreterInput) {
    const prompt = {
      type: 'input_text',
      text: 'Extrae la receta de esta fuente y devuelve únicamente la estructura solicitada.',
    } as const;
    if (input.kind === 'text') {
      return [prompt, { type: 'input_text' as const, text: input.text }];
    }
    if (input.kind === 'image') {
      return [
        prompt,
        {
          type: 'input_image' as const,
          detail: 'high' as const,
          image_url: `data:${input.mimeType};base64,${input.dataBase64}`,
        },
      ];
    }
    return [
      prompt,
      {
        type: 'input_file' as const,
        filename: input.filename,
        file_data: `data:application/pdf;base64,${input.dataBase64}`,
      },
    ];
  }

  private async request(
    apiKey: string,
    body: object,
    allowRetry: boolean,
  ): Promise<OpenAiResponse> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      if (allowRetry) return this.request(apiKey, body, false);
      throw new BadGatewayException('No se pudo contactar con el proveedor');
    }
    if (!response.ok) {
      if (allowRetry && (response.status === 429 || response.status >= 500)) {
        return this.request(apiKey, body, false);
      }
      throw new BadGatewayException('El proveedor no pudo procesar la fuente');
    }
    return (await response.json()) as OpenAiResponse;
  }
}
