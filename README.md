# Cocina Tuda

Cocina Tuda es una plataforma personal para convertir recetas procedentes de distintas fuentes en conocimiento culinario estructurado, consultable y reutilizable.

La documentación normativa se encuentra en [`docs/`](docs/README.md). El producto permite mantener e importar recetas, planificarlas y generar listas de compra editables.

## Estado actual

- Producto: línea base aprobada.
- Documentación funcional: aprobada.
- Arquitectura técnica: aprobada como punto de partida.
- Base técnica: Sprint 0B finalizado.
- Sprint 1: finalizado.
- Sprint 2: finalizado.
- Sprint 3: finalizado.
- Sprint 4: finalizado.
- Sprint 5: finalizado.
- Sprint 6: activo, implementación lista para revisión.
- Funcionalidades: catálogos, clasificación, búsqueda, mantenimiento e importación de recetas, planificación semanal y listas de compra editables disponibles.

Los cambios de alcance o arquitectura deberán actualizar la documentación correspondiente antes de implementarse.

## Requisitos

- Node.js 24 LTS o posterior compatible.
- pnpm 11.19.0, gestionado mediante Corepack.
- PostgreSQL accesible mediante `DATABASE_URL`.
- Una clave del proveedor externo configurado para interpretar importaciones.

## Instalación

```bash
corepack enable
pnpm install
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cocina_tuda"
export IMPORT_AI_PROVIDER="gemini"
export GEMINI_API_KEY="..."
# Opcional; el valor predeterminado es gemini-3.5-flash-lite.
export GEMINI_IMPORT_MODEL="gemini-3.5-flash-lite"
pnpm --filter @cocina-tuda/api db:migrate
```

El contenido de cada fuente importada se envía al proveedor externo solo después del consentimiento explícito del usuario. Cocina Tuda no conserva permanentemente la fuente original. En el nivel gratuito de Gemini, Google puede utilizar el contenido para mejorar sus productos; deben utilizarse únicamente fuentes que el usuario acepte compartir bajo esas condiciones.

El adaptador OpenAI continúa disponible como alternativa mediante `IMPORT_AI_PROVIDER=openai`, `OPENAI_API_KEY` y, opcionalmente, `OPENAI_IMPORT_MODEL`. La elección es configuración de servidor y no modifica el dominio ni el flujo de importación.

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

Las comprobaciones específicas de búsqueda, planificación y compras sobre PostgreSQL se ejecutan contra una base de pruebas ya migrada:

```bash
DATABASE_URL="postgresql://..." TEST_POSTGRES_URL="$DATABASE_URL" pnpm --filter @cocina-tuda/api test:postgres
DATABASE_URL="postgresql://..." pnpm --filter @cocina-tuda/api benchmark:search
```

El benchmark reemplaza los datos de la base indicada para generar su dataset reproducible; no debe apuntar a una base compartida.
