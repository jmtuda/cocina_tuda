# Cocina Tuda — Stack tecnológico

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Arquitecto Técnico

## 1. Stack propuesto

| Área                            | Elección                        |
| ------------------------------- | ------------------------------- |
| Lenguaje                        | TypeScript en modo estricto     |
| Runtime                         | Node.js LTS                     |
| Backend                         | NestJS                          |
| Frontend                        | Next.js y React                 |
| Estilos                         | Tailwind CSS                    |
| Componentes iniciales           | shadcn/ui cuando aporte valor   |
| Base de datos                   | PostgreSQL                      |
| Acceso a datos                  | Prisma                          |
| Gestor de paquetes              | pnpm                            |
| Monorepo                        | Turborepo                       |
| API                             | REST con OpenAPI                |
| Pruebas unitarias e integración | Vitest                          |
| Pruebas de navegador            | Playwright                      |
| Calidad                         | ESLint, Prettier y EditorConfig |
| Control de versiones            | Git y GitHub                    |

## 2. Criterios

Se priorizan soporte activo, documentación oficial, compatibilidad, necesidad actual y un número contenido de dependencias.

Las versiones exactas se fijarán al crear el proyecto usando versiones estables y soportadas en ese momento. Este documento no congela números de versión.

## 3. Decisiones que requieren validación en Sprint 0B

- Vitest ha quedado validado mediante el soporte oficial del generador de NestJS 12.
- Confirmar que Turborepo aporta valor con las aplicaciones y paquetes reales creados.
- Incorporar shadcn/ui gradualmente, no como requisito para componentes que aún no existen.
- Decidir si Docker es necesario para PostgreSQL local; no se crearán contenedores de frontend y backend sin necesidad operativa.

## 4. Dependencias

Toda dependencia nueva debe resolver una necesidad concreta, tener mantenimiento activo y licencia compatible. No se exige un ADR para cada librería; solo para cambios con consecuencias arquitectónicas duraderas.

## 5. Automatización

En cada pull request se ejecutarán, cuando existan los scripts correspondientes:

- formato o comprobación de formato;
- lint;
- typecheck;
- pruebas;
- build.

La entrega y el despliegue continuos quedan fuera del Sprint 0 hasta definir un entorno de publicación.
