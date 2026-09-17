import { BadRequestException, Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import type { SourceExtractor } from '../application/source-extractor.js';
import type {
  ImportSource,
  InterpreterInput,
} from '../domain/import-proposal.js';

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable()
export class DefaultSourceExtractor implements SourceExtractor {
  async extract(source: ImportSource): Promise<InterpreterInput> {
    if (source.kind === 'text') {
      const text = source.text.trim();
      if (!text) throw new BadRequestException('El texto está vacío');
      if (Buffer.byteLength(text, 'utf8') > MAX_BYTES)
        throw new BadRequestException('La fuente supera el tamaño permitido');
      return { kind: 'text', text };
    }

    const buffer = this.decode(source.dataBase64);
    if (buffer.byteLength > MAX_BYTES)
      throw new BadRequestException('El archivo supera el tamaño permitido');
    if (IMAGE_TYPES.has(source.mimeType)) {
      return {
        kind: 'image',
        mimeType: source.mimeType,
        dataBase64: buffer.toString('base64'),
      };
    }
    if (source.mimeType === 'application/pdf') {
      return {
        kind: 'file',
        filename: source.filename,
        mimeType: 'application/pdf',
        dataBase64: buffer.toString('base64'),
      };
    }
    if (
      source.mimeType === DOCX_TYPE &&
      source.filename.toLowerCase().endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.trim();
        if (!text) throw new Error('empty document');
        return { kind: 'text', text };
      } catch {
        throw new BadRequestException('No se pudo extraer el documento Word');
      }
    }
    throw new BadRequestException('Tipo de fuente no admitido');
  }

  private decode(value: string) {
    if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
      throw new BadRequestException('Contenido de archivo no válido');
    return Buffer.from(value, 'base64');
  }
}
