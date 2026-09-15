# Cocina Tuda

Cocina Tuda es una plataforma personal para convertir recetas procedentes de distintas fuentes en conocimiento culinario estructurado, consultable y reutilizable.

La línea base documental incluida en [`docs/`](docs/README.md) está aprobada. La implementación todavía no ha comenzado.

## Estado actual

- Producto: línea base aprobada.
- Documentación funcional: aprobada.
- Arquitectura técnica: aprobada como punto de partida.
- Base técnica: Sprint 0B finalizado.
- Funcionalidades de producto: no iniciadas.
- Sprint documental: finalizado.
- Próximo paso: definir el primer corte vertical de la biblioteca.

Los cambios de alcance o arquitectura deberán actualizar la documentación correspondiente antes de implementarse.

## Requisitos

- Node.js 24 LTS o posterior compatible.
- pnpm 11.19.0, gestionado mediante Corepack.

## Instalación

```bash
corepack enable
pnpm install
```

## Desarrollo

Ejecutar API y web simultáneamente:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Estado de la API: `http://localhost:3001/health`

## Validación

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

PostgreSQL y Prisma se incorporarán con el primer corte vertical que necesite persistencia.
