# Cocina Tuda — Sprint actual

**Versión:** 5.1

**Estado:** Finalizado

**Responsable:** Project Manager

## Estabilización previa a Fase 4

### Objetivo

Corregir los hallazgos bloqueantes de la revisión integral de Sprints 1–3 sin ampliar el alcance funcional ni iniciar Fase 4.

Sprint 1, Sprint 2 y Sprint 3 permanecen cerrados. La estabilización fue aprobada e integrada y el Project Manager ha levantado el bloqueo previo sobre Fase 4.

### Alcance finalizado

| Orden | Resultado verificable                                                                                        | Estado     |
| ----- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| 1     | Edición web completa sin pérdida silenciosa de pasos, ingredientes, cantidades, clasificaciones ni metadatos | Finalizado |
| 2     | Límites físicos y públicos de `library`, `catalog` y `search`                                                | Finalizado |
| 3     | Gestión web mínima de ingredientes, variantes y unidades conforme a las operaciones existentes               | Finalizado |
| 4     | DTO de respuesta, UUID y errores esperables coherentes; total correcto fuera de rango                        | Finalizado |
| 5     | Regresión general y recorrido real sobre PostgreSQL                                                          | Finalizado |

No se crean códigos TASK nuevos: es una estabilización de capacidades ya entregadas.

### Incluido

- Correcciones concretas aprobadas tras la auditoría integral.
- Pruebas unitarias, HTTP, web y PostgreSQL necesarias para protegerlas.
- Corrección de estructura, modelo de datos y estados de backlog afectados.

### Fuera de alcance

- Importación, IA, documentos o cualquier planificación e implementación de Fase 4.
- Nuevas capacidades de búsqueda, reglas funcionales o infraestructura general.
- Refactorizaciones preventivas y rediseño visual.

### Criterios de salida

- La edición completa desde web queda protegida por una regresión específica.
- Los tres módulos aprobados coinciden con la estructura física y no exponen modelos Prisma.
- Ingredientes, variantes y unidades son accesibles desde la interfaz en las operaciones permitidas actualmente.
- Los errores esperables no producen HTTP 500 y la paginación conserva el total real.
- Migraciones y recorrido creación → edición → clasificación → archivo/reactivación → búsqueda pasan sobre PostgreSQL real.
- Formato, lint, tipado, pruebas, E2E y builds permanecen verdes.
- B-001–B-004 vuelven a `Finalizado` tras la aprobación e integración de esta estabilización.
