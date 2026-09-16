# Cocina Tuda — Sprint actual

**Versión:** 3.1

**Estado:** Activo

**Responsable:** Project Manager

## Sprint 2 — Clasificación y biblioteca utilizable

### Objetivo

Convertir el corte vertical de Sprint 1 en una biblioteca navegable y mantenible: listar recetas, consultar y editar cualquiera de ellas, clasificarlas mediante categorías y etiquetas, y reducir el listado mediante filtros básicos.

Sprint 1 está finalizado. El Project Manager ha aprobado esta propuesta y las decisiones funcionales de Sprint 2.

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
- **Aplicación:** añadir operaciones de gestión de clasificaciones, asociación atómica al agregado receta, reactivación, listado paginado y consulta filtrada mediante contratos de repositorio.
- **Persistencia:** incorporar `categories`, `tags`, `recipe_categories` y `recipe_tags`, con claves foráneas, unicidad normalizada y pares receta-clasificación únicos; añadir solo los índices exigidos por las consultas aprobadas.
- **API:** ampliar `/api/v1` con contratos para categorías, etiquetas y listado filtrado; mantener DTO públicos independientes de Prisma y documentar el resultado en OpenAPI.
- **Interfaz:** presentar una biblioteca navegable y paginada, acceso a detalle/edición, archivo/reactivación, asignación de categorías y etiquetas y controles de filtro; no incorporar búsqueda textual.

### Migraciones

Se creará una nueva migración posterior a la de Sprint 1; la migración ya integrada no se reescribe. Debe poder aplicarse tanto sobre una base vacía mediante toda la cadena como sobre una base con datos de Sprint 1, sin alterar recetas existentes. Las relaciones muchos-a-muchos evitarán pares duplicados, no usarán eliminación en cascada de clasificaciones y permitirán renombrarlas sin reescribir las relaciones.

### Estrategia de pruebas

- **Dominio:** normalización y unicidad de categorías y etiquetas; ausencia de relaciones duplicadas.
- **Aplicación:** gestión y asignación de clasificaciones, listado, combinación de filtros y tratamiento de recetas archivadas conforme a las decisiones aprobadas.
- **Integración:** cadena completa de migraciones sobre PostgreSQL vacío y migración sobre datos de Sprint 1; restricciones únicas y referenciales; consultas filtradas.
- **API:** contratos, validación, conflictos, ausentes y semántica de filtros.
- **Web:** recorrido de abrir la biblioteca, entrar en una receta persistida, editarla, clasificarla y filtrar el listado.
- **Regresión:** conservar las garantías y recorridos de Sprint 1 y mantener verdes formato, lint, tipado, pruebas, e2e y builds.

### Criterios de aceptación

- La web muestra las recetas persistidas y permite abrir cualquiera de ellas sin conocer su ID.
- El listado se ordena por nombre normalizado ascendente, se pagina por página y tamaño y oculta por defecto las recetas archivadas.
- Existe una consulta explícita de archivadas; estas pueden consultarse, editarse y reactivarse, pero nunca eliminarse físicamente.
- El detalle recupera la receta completa y la edición conserva pasos, ingredientes y clasificaciones sin relaciones duplicadas.
- Se pueden gestionar y reutilizar categorías y etiquetas con unicidad por nombre normalizado y sin fusiones automáticas.
- Una receta puede asociarse con varias categorías y etiquetas planas, y cada relación es única.
- Categorías y etiquetas pueden crearse y renombrarse; solo pueden eliminarse sin asociaciones y el intento contrario se rechaza explícitamente.
- Los filtros de estado, categoría y etiqueta reducen el listado: OR dentro del mismo tipo y AND entre tipos diferentes.
- La nueva migración se aplica reproduciblemente sobre PostgreSQL y preserva los datos creados con Sprint 1.
- API y OpenAPI reflejan los contratos del sprint sin exponer modelos Prisma.
- Todas las comprobaciones de CI pasan y no existen defectos críticos conocidos.

### Decisiones aprobadas para la implementación

1. **Archivo:** el listado normal contiene solo activas; las archivadas tienen consulta explícita y pueden consultarse, editarse y reactivarse. Archivar no congela ni elimina.
2. **Filtros:** solo estado, categoría y etiqueta. Varias selecciones del mismo tipo usan OR; tipos diferentes se combinan con AND.
3. **Orden y paginación:** nombre normalizado ascendente y paginación simple por página/tamaño, con valores predeterminado y máximo decididos técnicamente.
4. **Ciclo de vida:** categorías y etiquetas se crean y renombran. Solo se eliminan sin asociaciones; no hay cascada ni fusión.
5. **Diferencia funcional:** la categoría pertenece a un catálogo controlado; la etiqueta es flexible y puede crecer libremente. Ambas son planas, reutilizables y múltiples por receta, sin metadatos adicionales.

### Fuera de alcance

- búsqueda textual, relevancia y filtros combinados de Fase 3;
- jerarquías de categorías o etiquetas;
- importación, planificación y compras;
- autenticación, multiusuario, sincronización u offline;
- categorías o etiquetas sugeridas por IA;
- diseño visual definitivo y despliegue.
