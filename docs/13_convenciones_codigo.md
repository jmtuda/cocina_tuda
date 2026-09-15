# Cocina Tuda — Convenciones de código y colaboración

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Arquitecto Técnico

## 1. Código

- TypeScript estricto; `any` requiere una razón local y visible.
- Nombres técnicos en inglés.
- Carpetas en `kebab-case`; clases y tipos en `PascalCase`; variables y funciones en `camelCase`.
- Archivos en `kebab-case` con sufijos útiles cuando aclaren su función.
- Interfaces sin prefijo `I`.
- Funciones, clases y componentes con una responsabilidad comprensible.
- Abstracciones creadas por necesidad, no por anticipación.

Los límites orientativos de tamaño pueden provocar una revisión, nunca una división automática.

## 2. Arquitectura

- Las invariantes pertenecen al dominio.
- Los casos de uso coordinan acciones.
- Los adaptadores HTTP validan formato y traducen resultados.
- Los repositorios e integraciones implementan contratos sin introducir reglas funcionales.
- Los componentes visuales no acceden directamente a la base de datos ni deciden reglas de negocio.
- Las entidades internas no se reutilizan como DTO públicos.

## 3. Errores, registros y secretos

Los errores se tratan explícitamente y conservan su causa técnica internamente. Las respuestas públicas no revelan trazas ni secretos.

No se registran contraseñas, tokens, claves API ni contenido personal innecesario. `.env` y equivalentes se excluyen; `.env.example` solo contiene nombres y ejemplos no sensibles.

## 4. Pruebas

Los nombres describen comportamiento. Las pruebas del dominio no dependen de red, framework o base de datos. Se prueban escenarios relevantes, límites y errores esperados; la cobertura porcentual es un indicador, no una Definition of Done.

## 5. Git

Ramas cortas desde `main`:

- `docs/...`
- `feature/...`
- `fix/...`
- `refactor/...`
- `chore/...`

No se utiliza una rama permanente `develop`.

Los commits siguen Conventional Commits cuando resulte aplicable, por ejemplo `docs(domain): align persistence model`.

## 6. Pull requests

Todo cambio se integra mediante pull request. Debe explicar propósito, cambios, validación y riesgos relevantes. Las PR deben representar un cambio revisable; no existe un límite mecánico de líneas.

Tras disponer de CI, `main` requerirá sus comprobaciones. Se bloquearán force-push y borrado.

## 7. Definition of Done

Una tarea está terminada cuando:

- cumple sus criterios de aceptación;
- respeta los límites arquitectónicos;
- incluye las pruebas proporcionadas al riesgo;
- supera las comprobaciones disponibles;
- actualiza la documentación afectada;
- ha sido revisada e integrada.

No se exige ADR para decisiones locales y reversibles. Sí para cambios arquitectónicos duraderos o excepciones relevantes.
