# Guía para agentes — Cocina Tuda

## Objetivo y fuente de verdad

Aplicación personal para mantener recetas estructuradas, importarlas con revisión humana, planificar comidas y generar listas de compra. GitHub (`jmtuda/cocina_tuda`), su `main`, el código y la documentación versionada son la fuente de verdad; una conversación no acredita implementación ni datos cargados.

Antes de trabajar: `git fetch origin`, revisar `git status`, ramas, stashes y diferencias con `origin/main`. Leer `README.md`, `docs/PROJECT_STATUS.md` y el índice normativo `docs/README.md`. Preservar el trabajo local ajeno. No ampliar el alcance sin encargo.

## Stack y estructura real

- Monorepo pnpm 11.19.0 y Turborepo; Node.js >=24.
- `apps/api`: NestJS 12, TypeScript, Prisma 7 con adaptador pg, PostgreSQL; API REST `/api/v1` y Swagger.
- `apps/api/src/modules`: `catalog`, `library`, `search`, `import`, `planning`, `shopping`, separados en dominio, aplicación, infraestructura y presentación.
- `apps/api/prisma`: esquema y seis migraciones acumulativas; `src/generated/prisma` es cliente generado versionado.
- `apps/web`: Next.js 16.3.5, React 19, Tailwind 4; interfaz en `app/kitchen-app.tsx`, cliente en `lib/api.ts`. Respetar también `apps/web/AGENTS.md` y consultar las guías locales de Next antes de cambiar código web.
- `docs`: decisiones, dominio, backlog y roadmap; `docs/adr` para decisiones duraderas.
- `.github/workflows/ci.yml`: comprobación `validate`.

## Comandos desde la raíz

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @cocina-tuda/api prisma:generate
# Configurar DATABASE_URL en el entorno antes de migrar/ejecutar.
pnpm --filter @cocina-tuda/api db:migrate
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Web en 3000, API en 3001; health `/api/v1/health`, documentación `/api/v1/docs`. Tras compilar: `pnpm --filter @cocina-tuda/api start:prod` y `pnpm --filter @cocina-tuda/web start` en procesos separados. El proxy web apunta a `127.0.0.1:3001`; ajustar configuración si cambia la topología.

Ejecutar las comprobaciones secuencialmente, como CI: no simultanear build y typecheck de Next porque comparten `.next`. Para evitar caché de Turbo, usar por separado `pnpm exec turbo run lint --force`, `typecheck --force`, `test --force` y `build --force`.

En una base **desechable y ya migrada**, configurar `DATABASE_URL` y `TEST_POSTGRES_URL` apuntando exclusivamente a esa base y ejecutar `pnpm --filter @cocina-tuda/api test:postgres`. El benchmark `pnpm --filter @cocina-tuda/api benchmark:search` usa `DATABASE_URL`. Ambos borran datos: nunca usar la base del propietario. Sin `TEST_POSTGRES_URL`, las pruebas PostgreSQL se omiten, no pasan.

## Reglas del dominio y de implementación

Mantener el monolito modular y consumir contratos públicos entre módulos. No usar tablas/repositorios internos de otros módulos. Conservar cantidades decimales exactas, ausencia de cantidad, variantes, unidades y opcionalidad. Compras es una instantánea independiente; no convertir unidades ni escalar raciones automáticamente.

La IA propone; el usuario decide. Exigir consentimiento para enviar fuentes al proveedor. La creación de catálogo requiere revisión explícita; una colisión normalizada exige seleccionar el existente, nunca fusionarlo automáticamente. Confirmar receta y catálogo en una transacción idempotente. No conservar permanentemente el archivo fuente.

Una eventual carga histórica XLSX es una operación única: no añadir interfaz, endpoint ni mecanismo permanente de importación masiva. No afirmar que se ejecutó sin evidencia de datos y trazabilidad verificable.

## Seguridad

No subir `.env`, claves, tokens, credenciales, fuentes privadas, XLSX del propietario, volcados de DB ni logs sensibles. No imprimir valores del entorno. Usar variables del servidor para claves de IA; jamás `NEXT_PUBLIC_*`. El MVP no tiene autenticación ni aislamiento multiusuario y habilita CORS: mantenerlo en un entorno local/de confianza, sin exposición pública. No ejecutar migraciones destructivas ni pruebas que truncan datos sobre la base real.

## Criterios de tarea terminada

Código y documentación coherentes; pruebas pertinentes ejecutadas con resultados y omisiones explícitos; diff revisado sin secretos ni artefactos temporales. Actualizar `docs/PROJECT_STATUS.md` cuando cambie el estado. Seguir las protecciones vigentes: en este traspaso `main` requiere PR, `validate`, resolución de conversaciones e historial lineal. No saltarse protecciones con privilegios de administrador. Integrar solo con CI verde y después dejar `main` limpio y sincronizado con `origin/main`. No declarar completada una tarea bloqueada por infraestructura.
