import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { app } = vi.hoisted(() => ({
  app: {
    setGlobalPrefix: vi.fn(),
    enableCors: vi.fn(),
    useGlobalPipes: vi.fn(),
    listen: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@nestjs/core', () => ({
  NestFactory: { create: vi.fn().mockResolvedValue(app) },
}));
vi.mock('./app.module.js', () => ({ AppModule: class {} }));
vi.mock('@nestjs/swagger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/swagger')>();
  return {
    ...actual,
    SwaggerModule: { createDocument: vi.fn(), setup: vi.fn() },
  };
});

describe('API bootstrap environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loads the environment file before starting the application', async () => {
    const directory = mkdtempSync(join(process.cwd(), '.env.bootstrap-test-'));
    const path = join(directory, '.env');
    writeFileSync(path, 'PORT=49152\n');
    vi.stubEnv('PORT', undefined);
    vi.stubEnv('DOTENV_CONFIG_PATH', path);
    vi.stubEnv('DOTENV_CONFIG_QUIET', 'true');

    try {
      await import('./main.js');
      expect(app.listen).toHaveBeenCalledWith('49152');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('preserves configuration explicitly supplied by the process', async () => {
    const directory = mkdtempSync(join(process.cwd(), '.env.bootstrap-test-'));
    const path = join(directory, '.env');
    writeFileSync(path, 'PORT=49152\n');
    vi.stubEnv('PORT', '49153');
    vi.stubEnv('DOTENV_CONFIG_PATH', path);
    vi.stubEnv('DOTENV_CONFIG_QUIET', 'true');

    try {
      await import('./main.js');
      expect(app.listen).toHaveBeenCalledWith('49153');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
