import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(() => Promise.resolve({ value: 'Receta Word' })),
  },
}));

import { DefaultSourceExtractor } from './default-source-extractor.js';

describe('DefaultSourceExtractor', () => {
  let extractor: DefaultSourceExtractor;

  beforeEach(() => {
    extractor = new DefaultSourceExtractor();
  });

  it('accepts pasted text', async () => {
    await expect(
      extractor.extract({ kind: 'text', text: '  Receta  ' }),
    ).resolves.toEqual({ kind: 'text', text: 'Receta' });
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s images',
    async (mimeType) => {
      await expect(
        extractor.extract({
          kind: 'file',
          filename: 'receta',
          mimeType,
          dataBase64: Buffer.from('image').toString('base64'),
        }),
      ).resolves.toMatchObject({ kind: 'image', mimeType });
    },
  );

  it('accepts textual or scanned PDF as a provider file input', async () => {
    await expect(
      extractor.extract({
        kind: 'file',
        filename: 'receta.pdf',
        mimeType: 'application/pdf',
        dataBase64: Buffer.from('%PDF fixture').toString('base64'),
      }),
    ).resolves.toMatchObject({ kind: 'file', mimeType: 'application/pdf' });
  });

  it('extracts DOCX text and rejects old DOC', async () => {
    await expect(
      extractor.extract({
        kind: 'file',
        filename: 'receta.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dataBase64: Buffer.from('docx fixture').toString('base64'),
      }),
    ).resolves.toEqual({ kind: 'text', text: 'Receta Word' });
    await expect(
      extractor.extract({
        kind: 'file',
        filename: 'receta.doc',
        mimeType: 'application/msword',
        dataBase64: Buffer.from('doc fixture').toString('base64'),
      }),
    ).rejects.toThrow('Tipo de fuente no admitido');
  });
});
