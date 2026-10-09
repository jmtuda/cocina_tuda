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

  it('allows runtime import to finish while intercepted listen is pending', async () => {
    vi.stubEnv('DOTENV_CONFIG_PATH', '/dev/null');
    vi.stubEnv('PORT', '49154');
    let releaseListen = () => {};
    const listening = new Promise<void>((resolve) => {
      releaseListen = resolve;
    });
    app.listen.mockReturnValueOnce(listening);
    const loading = import('./main.js');

    try {
      await vi.waitFor(() => {
        expect(app.listen).toHaveBeenCalledWith('49154');
      });
      const outcome = await Promise.race([
        loading.then(() => 'loaded'),
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('blocked'), 100);
        }),
      ]);
      expect(outcome).toBe('loaded');
    } finally {
      releaseListen();
      await loading;
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
