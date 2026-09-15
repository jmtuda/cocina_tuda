# Cocina Tuda — Sprint actual

**Versión:** 3.0

**Estado:** Propuesto

**Responsable:** Project Manager

## Sprint 2 — Clasificación y biblioteca utilizable

### Objetivo

Convertir el corte vertical de Sprint 1 en una biblioteca navegable y mantenible: listar recetas, consultar y editar cualquiera de ellas, clasificarlas mediante categorías y etiquetas, y reducir el listado mediante filtros básicos.

Sprint 1 está finalizado. Esta propuesta corresponde exclusivamente a la Fase 2 vigente y no autoriza implementación hasta que el Project Manager resuelva las decisiones abiertas y apruebe el sprint.

### Alcance validado

| Orden | Tarea    | Resultado verificable                                                    | Depende de |
| ----- | -------- | ------------------------------------------------------------------------ | ---------- |
| 1     | TASK-020 | Categorías y etiquetas persistentes, gestionables y asociables a recetas | Sprint 1   |
| 2     | TASK-021 | Listado navegable y flujos completos de detalle y edición                | Sprint 1   |
| 3     | TASK-022 | Filtros básicos sobre el listado conforme a las decisiones aprobadas     | 020, 021   |

`TASK-020` cubre B-005. `TASK-021` completa la experiencia de B-001 y B-002 ya entregada en Sprint 1. `TASK-022` cubre solo la parte de filtros de B-006; B-006 no puede marcarse Finalizado hasta incorporar la búsqueda prevista en Fase 3.

### Punto de partida real

- La API permite crear, recuperar por ID, editar y archivar una receta, pero no listar recetas.
- La web permite crear y modificar la receta cuyo ID conserva durante la sesión; no permite navegar por recetas persistidas ni abrir otra receta.
- El esquema ya contempla recetas, pasos, ingredientes, variantes y unidades. No existen tablas ni código de categorías y etiquetas.
- PostgreSQL, Prisma, API `/api/v1`, OpenAPI, validación, repositorios transaccionales y pruebas constituyen la base disponible.

### Cambios previstos

- **Dominio:** materializar categoría y etiqueta como catálogos planos con nombre normalizado único; proteger que una receta no repita una misma relación de clasificación.
- **Aplicación:** añadir operaciones de gestión de clasificaciones, asociación atómica al agregado receta, listado y consulta filtrada mediante contratos de repositorio.
- **Persistencia:** incorporar `categories`, `tags`, `recipe_categories` y `recipe_tags`, con claves foráneas, unicidad normalizada y pares receta-clasificación únicos; añadir solo los índices exigidos por las consultas aprobadas.
- **API:** ampliar `/api/v1` con contratos para categorías, etiquetas y listado filtrado; mantener DTO públicos independientes de Prisma y documentar el resultado en OpenAPI.
- **Interfaz:** presentar una biblioteca navegable, acceso a detalle/edición, asignación de categorías y etiquetas y controles de filtro; no incorporar búsqueda textual.

### Migraciones

Se creará una nueva migración posterior a la de Sprint 1; la migración ya integrada no se reescribe. Debe poder aplicarse tanto sobre una base vacía mediante toda la cadena como sobre una base con datos de Sprint 1, sin alterar recetas existentes. Las relaciones muchos-a-muchos evitarán pares duplicados y preservarán la integridad referencial conforme a la política de eliminación que apruebe el Project Manager.

### Estrategia de pruebas

- **Dominio:** normalización y unicidad de categorías y etiquetas; ausencia de relaciones duplicadas.
- **Aplicación:** gestión y asignación de clasificaciones, listado, combinación de filtros y tratamiento de recetas archivadas conforme a las decisiones aprobadas.
- **Integración:** cadena completa de migraciones sobre PostgreSQL vacío y migración sobre datos de Sprint 1; restricciones únicas y referenciales; consultas filtradas.
- **API:** contratos, validación, conflictos, ausentes y semántica de filtros.
- **Web:** recorrido de abrir la biblioteca, entrar en una receta persistida, editarla, clasificarla y filtrar el listado.
- **Regresión:** conservar las garantías y recorridos de Sprint 1 y mantener verdes formato, lint, tipado, pruebas, e2e y builds.

### Criterios de aceptación

- La web muestra las recetas persistidas y permite abrir cualquiera de ellas sin conocer su ID.
- El detalle recupera la receta completa y la edición conserva pasos, ingredientes y clasificaciones sin relaciones duplicadas.
- Se pueden gestionar y reutilizar categorías y etiquetas con unicidad por nombre normalizado y sin fusiones automáticas.
- Una receta puede asociarse con varias categorías y etiquetas planas, y cada relación es única.
- Los filtros aprobados reducen el listado con semántica consistente entre API y web y sin incorporar búsqueda textual.
- La nueva migración se aplica reproduciblemente sobre PostgreSQL y preserva los datos creados con Sprint 1.
- API y OpenAPI reflejan los contratos del sprint sin exponer modelos Prisma.
- Todas las comprobaciones de CI pasan y no existen defectos críticos conocidos.

### Decisiones requeridas antes de activar el sprint

1. **Visibilidad de recetas archivadas:** decidir si se ocultan por defecto, si existe un filtro para mostrarlas y si una receta archivada puede editarse o debe restaurarse primero.
2. **Filtros básicos:** confirmar si Sprint 2 filtra por categoría, etiqueta y estado de archivo; definir si seleccionar varios valores del mismo tipo exige cumplir cualquiera o todos, y cómo se combinan categorías con etiquetas.
3. **Orden y volumen del listado:** definir el orden inicial observable y si el primer listado necesita paginación o puede cargar el conjunto completo durante el MVP.
4. **Gestión de categorías y etiquetas:** decidir si en este sprint se crean y renombran solamente o también se eliminan; si se permite eliminar, definir qué ocurre cuando la clasificación está asociada a recetas. Nunca se fusionarán automáticamente nombres normalizados equivalentes.
5. **Diferencia funcional:** confirmar si categorías y etiquetas requieren comportamientos distintos más allá de ser dos catálogos planos, uno estructurado y otro flexible.

### Fuera de alcance

- búsqueda textual, relevancia y filtros combinados de Fase 3;
- jerarquías de categorías o etiquetas;
- importación, planificación y compras;
- autenticación, multiusuario, sincronización u offline;
- categorías o etiquetas sugeridas por IA;
- diseño visual definitivo y despliegue.
