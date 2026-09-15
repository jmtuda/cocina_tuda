# Cocina Tuda — Sprint actual

**Versión:** 2.3

**Estado:** Finalizado

**Responsable:** Project Manager

## Sprint 1 — Biblioteca mínima

### Objetivo

Entregar el primer corte vertical: una receta puede crearse, consultarse, editarse y archivarse mediante web y API, con pasos e ingredientes vinculados a catálogos persistentes.

Sprint 0A, Sprint 0B y Sprint 1 están finalizados. La Fase 2 no está planificada ni activa.

### Alcance validado

El alcance procede de la Fase 1 de `05_roadmap.md`:

| Orden | Tarea    | Resultado verificable                                                          | Estado     | Depende de |
| ----- | -------- | ------------------------------------------------------------------------------ | ---------- | ---------- |
| 1     | TASK-010 | Dominio mínimo de receta y paso, con sus invariantes probadas                  | Finalizada | —          |
| 2     | TASK-011 | Dominio de ingredientes, variantes y unidades, con normalización definida      | Finalizada | —          |
| 3     | TASK-012 | Ingredientes de receta y validación de variante, cantidad y unidad             | Finalizada | 010, 011   |
| 4     | TASK-013 | Esquema Prisma, PostgreSQL, repositorios y migraciones reproducibles           | Finalizada | 010–012    |
| 5     | TASK-014 | Casos de uso y API REST `/api/v1` para el corte completo                       | Finalizada | 010–013    |
| 6     | TASK-015 | Interfaz mínima de creación, consulta, edición y archivo, y recorrido completo | Finalizada | 014        |

`TASK-020` pertenece a la Fase 2 y comprende categorías y etiquetas. `TASK-021` y `TASK-022` también pertenecen a la Fase 2; `TASK-023` no existe en el roadmap vigente. Por tanto, ninguna clasificación entra en este sprint.

### Resultado del cierre

La migración se aplicó desde cero sobre PostgreSQL 17 aislado. Se verificaron el esquema, la precisión decimal, las restricciones de unicidad y pertenencia de variante, y el recorrido creación → persistencia → reinicio → lectura. Formato, lint, tipado, pruebas, e2e y builds finalizaron correctamente antes de integrar la implementación.

### Correspondencia entre dominio y persistencia

| Dominio                 | Persistencia                                                              | Integridad principal                                            |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Receta                  | `recipes`                                                                 | estado válido; archivo lógico; fechas coherentes                |
| Paso                    | `recipe_steps`                                                            | FK a receta y posición única por receta                         |
| Ingrediente             | `ingredients`                                                             | nombre normalizado único                                        |
| Variante de ingrediente | `ingredient_variants`                                                     | FK a ingrediente y nombre normalizado único dentro de él        |
| Unidad                  | `units`                                                                   | nombre normalizado único                                        |
| Ingrediente de receta   | `recipe_ingredients`                                                      | FK a receta, ingrediente, unidad opcional y variante compatible |
| Receta como agregado    | repositorio de receta que carga y guarda pasos y usos de ingredientes     | las escrituras del agregado son atómicas                        |
| Catálogo como módulo    | repositorios según los casos de uso de ingredientes, variantes y unidades | no se expone Prisma fuera de infraestructura                    |

Los modelos Prisma no se usarán como entidades ni DTO públicos. `library` consumirá operaciones públicas de `catalog`; no accederá a sus implementaciones internas.

### Reglas que debe proteger la implementación

- Una receta se archiva; no se elimina físicamente.
- La posición de cada paso es única dentro de su receta.
- La posición de cada ingrediente de receta debe conservar un orden estable.
- Ingredientes y unidades tienen un nombre normalizado único; una variante lo tiene dentro de su ingrediente.
- Una variante seleccionada pertenece al ingrediente seleccionado.
- Cantidad, unidad, opcionalidad y observaciones pertenecen al ingrediente de receta, nunca al catálogo.
- La unidad, cuando existe, referencia el catálogo; no se admite texto libre.
- Una receta puede contener varios usos del mismo ingrediente y variante, incluso líneas idénticas; cada línea representa un uso culinario independiente.
- Los cambios que afecten conjuntamente a receta, pasos e ingredientes de receta son atómicos.
- El dominio no depende de NestJS, Prisma, PostgreSQL ni HTTP.

### Estrategia de implementación y migraciones

1. Cerrar las decisiones bloqueantes y reflejarlas en los documentos normativos afectados.
2. Implementar y probar el dominio de `library` y `catalog` sin framework ni base de datos.
3. Incorporar PostgreSQL y Prisma únicamente en `apps/api`; decidir PostgreSQL local frente a Docker por necesidad operativa.
4. Crear una migración inicial única para las tablas de este sprint: `recipes`, `recipe_steps`, `ingredients`, `ingredient_variants`, `units` y `recipe_ingredients`. No incluir tablas de fases posteriores.
5. Expresar en base de datos todas las restricciones posibles. La compatibilidad ingrediente-variante debe quedar protegida también en la base de datos, no solo mediante validación de aplicación.
6. Verificar aplicar la migración sobre una base vacía y ejecutar el corte contra PostgreSQL aislado antes de exponer la API.
7. Añadir casos de uso y adaptadores REST; generar OpenAPI desde la implementación.
8. Añadir la interfaz mínima y un único recorrido de navegador para el flujo completo.

Mientras no exista una versión publicada, una corrección de la migración inicial se realiza sustituyéndola antes de integrar. Tras su integración, toda evolución usa una migración nueva y reproducible.

### Estrategia de pruebas

- **Dominio:** estados de receta, archivo, orden de pasos, normalización y unicidad, pertenencia de variantes, unidad catalogada y reglas del ingrediente de receta.
- **Aplicación:** creación, consulta, edición y archivo; coordinación atómica del agregado; traducción de errores esperados.
- **Integración:** repositorios Prisma, migración desde base vacía, restricciones únicas y referenciales, y rechazo de una variante de otro ingrediente.
- **API:** contratos y códigos para caminos principales, entradas inválidas, ausentes, conflictos y receta archivada.
- **Web:** recorrido crítico de crear, consultar, editar y archivar una receta con pasos e ingredientes; las validaciones exhaustivas permanecen en niveles inferiores.
- **CI:** formato, lint, tipado, pruebas y build deben seguir pasando desde la raíz.

### Criterios de aceptación del sprint

- Desde la web se puede crear una receta persistente con pasos e ingredientes de receta que referencian ingredientes, variantes y unidades válidos.
- La receta se puede recuperar tras reiniciar la aplicación, editar sin duplicar relaciones y archivar sin eliminar sus datos.
- El catálogo permite crear y reutilizar ingredientes, variantes y unidades respetando su unicidad normalizada.
- API y web representan y validan cantidades conforme a la decisión aprobada.
- Ninguna escritura puede persistir una variante asociada a otro ingrediente ni posiciones de paso duplicadas.
- La migración se aplica reproduciblemente sobre PostgreSQL vacío y sus restricciones tienen pruebas de integración.
- La API se publica bajo `/api/v1`, no expone modelos Prisma y genera un contrato OpenAPI coherente.
- Las dependencias respetan los límites `library`/`catalog` y dominio/aplicación/infraestructura/presentación.
- Todas las comprobaciones de CI pasan y no existen defectos críticos conocidos.

### Decisiones aprobadas para la implementación

1. **Cantidades:** `IngredienteReceta` contiene un valor numérico decimal opcional, separado de `Unidad`. No es una entidad independiente, no se representa mediante `float` y su ausencia expresa que no existe una cantidad exacta.
2. **Colisiones normalizadas:** la normalización detecta y previene duplicados. Una colisión se rechaza o requiere resolución explícita; nunca fusiona entidades automáticamente. Se aplica unicidad normalizada donde el nombre identifica funcionalmente el elemento.
3. **Ingredientes repetidos en una receta:** se permiten múltiples usos con el mismo ingrediente y variante. No existe una restricción de unicidad por receta, ingrediente y variante ni se impiden por ahora líneas idénticas.

No bloquean este sprint el comportamiento de una receta archivada ya planificada ni la consolidación de unidades en compras, porque planificación y compras pertenecen a fases posteriores. Identificadores, algoritmo exacto de normalización y mecanismo de integridad ingrediente-variante son decisiones técnicas que Arquitectura puede proponer una vez aprobado el comportamiento funcional.

### Fuera de alcance

- categorías, etiquetas, listado completo y filtros de la Fase 2;
- búsqueda;
- importación;
- planificación y compras;
- autenticación, multiusuario, sincronización u offline;
- diseño final de interfaz y despliegue.
