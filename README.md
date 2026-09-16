# Cocina Tuda

Cocina Tuda es una plataforma personal para convertir recetas procedentes de distintas fuentes en conocimiento culinario estructurado, consultable y reutilizable.

La documentación normativa se encuentra en [`docs/`](docs/README.md). Los dos primeros sprints han construido una biblioteca clasificable y navegable.

## Estado actual

- Producto: línea base aprobada.
- Documentación funcional: aprobada.
- Arquitectura técnica: aprobada como punto de partida.
- Base técnica: Sprint 0B finalizado.
- Sprint 1: finalizado.
- Sprint 2: finalizado.
- Sprint 3: activo, implementación de búsqueda lista para revisión.
- Funcionalidades: catálogos, clasificación, listado filtrable, búsqueda y mantenimiento de recetas disponibles.

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

Las comprobaciones específicas de búsqueda sobre PostgreSQL se ejecutan contra una base de pruebas ya migrada:

```bash
DATABASE_URL="postgresql://..." TEST_POSTGRES_URL="$DATABASE_URL" pnpm --filter @cocina-tuda/api test:postgres
DATABASE_URL="postgresql://..." pnpm --filter @cocina-tuda/api benchmark:search
```

El benchmark reemplaza los datos de la base indicada para generar su dataset reproducible; no debe apuntar a una base compartida.
