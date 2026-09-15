# ADR-0001 — Arquitectura inicial

**Estado:** Aceptado

**Fecha:** 2026-09-15

## Contexto

Cocina Tuda necesita una base técnica para una aplicación web y una API, manteniendo el dominio independiente y evitando construir anticipadamente capacidades futuras.

## Alternativas consideradas

- Repositorios separados para web y API.
- Monorepo con microservicios independientes.
- Monorepo con monolito modular.

## Decisión

Se adopta un monorepo gestionado con pnpm y Turborepo que contiene:

- una aplicación web Next.js;
- una API NestJS;
- paquetes compartidos únicamente cuando aparezca más de un consumidor real.

La API se organizará como monolito modular. Los límites entre dominio, aplicación, infraestructura y presentación se introducirán dentro de cada módulo en la medida en que separen responsabilidades reales.

La base inicial utiliza TypeScript estricto, Vitest, ESLint, Prettier y GitHub Actions. PostgreSQL y Prisma se incorporarán con el primer corte vertical que necesite persistencia.

## Consecuencias

- Web y API comparten herramientas y versiones sin compartir implementaciones internas.
- Se evita el coste operativo de microservicios durante el MVP.
- El dominio puede mantenerse independiente de frameworks y persistencia.
- La extracción futura de módulos continúa siendo posible si aparece una necesidad demostrada.
- La estructura deberá validarse con el primer corte vertical y podrá ajustarse mediante un nuevo ADR.
