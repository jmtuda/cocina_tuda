import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from '../application/catalog.service.js';
import { CATALOG_REPOSITORY } from '../application/catalog.repository.js';
const id = '11111111-1111-4111-8111-111111111111';
const variant = '22222222-2222-4222-8222-222222222222';
let app: INestApplication;
const repository = {
  updateIngredient: vi.fn(),
  updateVariant: vi.fn(),
  updateUnit: vi.fn(),
};
beforeEach(async () => {
  vi.resetAllMocks();
  const module = await Test.createTestingModule({
    controllers: [CatalogController],
    providers: [
      CatalogService,
      { provide: CATALOG_REPOSITORY, useValue: repository },
    ],
  }).compile();
  app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
});
afterEach(async () => {
  await app.close();
});
it.each([
  ['ingredients', 'updateIngredient', { name: 'Tomate' }],
  [`ingredients/${id}/variants`, 'updateVariant', { name: 'Cherry' }],
  ['units', 'updateUnit', { name: 'Gramo', abbreviation: 'g' }],
] as const)(
  'PATCH %s persists with validated DTO and stable id',
  async (path, method, body) => {
    const target = method === 'updateVariant' ? variant : id;
    repository[method].mockResolvedValue({ id: target, ...body });
    const http = () => request(app.getHttpServer() as Server);
    await http()
      .patch(`/catalog/${path}/${target}`)
      .send(body)
      .expect(200)
      .expect({ id: target, ...body });
    expect(repository[method]).toHaveBeenCalled();
    await http().patch(`/catalog/${path}/invalid`).send(body).expect(400);
    await http()
      .patch(`/catalog/${path}/${target}`)
      .send({ name: ' ' })
      .expect(400);
    await http()
      .patch(`/catalog/${path}/${target}`)
      .send({ ...body, ingredientId: id })
      .expect(400);
    repository[method].mockRejectedValue({ code: 'P2002' });
    await http().patch(`/catalog/${path}/${target}`).send(body).expect(409);
    repository[method].mockRejectedValue({ code: 'P2025' });
    await http().patch(`/catalog/${path}/${target}`).send(body).expect(404);
  },
);
