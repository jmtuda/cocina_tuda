# Cocina Tuda

Cocina Tuda es una plataforma personal para convertir recetas procedentes de distintas fuentes en conocimiento culinario estructurado, consultable y reutilizable.

La documentación normativa se encuentra en [`docs/`](docs/README.md). Sprint 1 implementa el primer corte vertical de la biblioteca.

## Estado actual

- Producto: línea base aprobada.
- Documentación funcional: aprobada.
- Arquitectura técnica: aprobada como punto de partida.
- Base técnica: Sprint 0B finalizado.
- Sprint 1: finalizado.
- Funcionalidades: catálogos y creación, consulta, edición y archivo de recetas disponibles.

Los cambios de alcance o arquitectura deberán actualizar la documentación correspondiente antes de implementarse.

## Requisitos

- Node.js 24 LTS o posterior compatible.
- pnpm 11.19.0, gestionado mediante Corepack.
- PostgreSQL accesible mediante `DATABASE_URL`.

## Instalación

```bash
corepack enable
pnpm install
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cocina_tuda"
pnpm --filter @cocina-tuda/api db:migrate
```

## Desarrollo

Ejecutar API y web simultáneamente:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Estado de la API: `http://localhost:3001/api/v1/health`
- OpenAPI: `http://localhost:3001/api/v1/docs`

## Validación

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

La migración de Sprint 1 crea exclusivamente recetas, pasos, ingredientes, variantes, unidades e ingredientes de receta.
