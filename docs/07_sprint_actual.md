# Cocina Tuda — Sprint actual

**Versión:** 4.1

**Estado:** Finalizado

**Responsable:** Project Manager

## Sprint 3 — Búsqueda

### Objetivo

Completar B-006 para que el usuario localice recetas por texto e ingredientes, combinando esos criterios con los filtros de estado, categoría y etiqueta ya disponibles, con un comportamiento de relevancia explícito y rendimiento validado sobre una biblioteca representativa.

Sprint 1, Sprint 2 y Sprint 3 están finalizados. La Fase 4 no está planificada ni activa.

### Alcance finalizado

| Orden | Tarea    | Resultado verificable                                                              | Estado     | Depende de |
| ----- | -------- | ---------------------------------------------------------------------------------- | ---------- | ---------- |
| 1     | TASK-030 | Reglas aprobadas de consulta, coincidencia, combinación, relevancia y casos límite | Finalizada | Sprint 2   |
| 2     | TASK-031 | Búsqueda por texto e ingredientes integrada con filtros y paginación existentes    | Finalizada | 030        |
| 3     | TASK-032 | Rendimiento medido y aceptado con una biblioteca representativa                    | Finalizada | 031        |

Las tres tareas completan B-006. Categorías, etiquetas, estado, orden y paginación ya entregados se reutilizan; no se reimplementan.

### Dependencias y orden

1. Aprobar las decisiones funcionales de TASK-030 y convertirlas en ejemplos verificables.
2. Diseñar los contratos de consulta sin acoplar aplicación ni API a Prisma.
3. Implementar TASK-031 de persistencia a interfaz, conservando la semántica vigente de archivo, filtros y paginación.
4. Preparar el conjunto representativo, medir los recorridos acordados y ajustar solo los índices o consultas justificados por TASK-032.
5. Ejecutar regresión completa sobre las capacidades de Sprint 1 y Sprint 2.

### Cambios previstos

- **Dominio:** no se prevén entidades ni reglas nuevas; la búsqueda consulta la biblioteca y los catálogos sin modificar datos funcionales.
- **Aplicación:** incorporar un contrato de búsqueda paginada y su composición con estado, categorías, etiquetas e ingredientes, manteniendo separada la política de relevancia.
- **Persistencia:** implementar consultas PostgreSQL reproducibles y añadir únicamente los índices o capacidades de búsqueda que resulten necesarios tras aprobar TASK-030 y medir TASK-032. Cualquier migración será aditiva y se validará desde una base vacía y sobre el esquema de Sprint 2.
- **API:** ampliar el contrato de consulta bajo `/api/v1`, documentar parámetros, validaciones, paginación, orden/relevancia y respuesta en OpenAPI, sin exponer modelos Prisma.
- **Interfaz:** añadir entrada de búsqueda y selección por ingredientes al listado existente, conservar los filtros de estado, categoría y etiqueta y representar carga, ausencia de resultados, errores y paginación.

### Incluido

- búsqueda textual sobre nombre, descripción, ingredientes, variantes, categorías y etiquetas, sin incluir pasos ni notas;
- coincidencia sin distinción de mayúsculas ni acentos y con parciales razonables; todas las palabras deben aparecer en algún campo buscable;
- filtro que distingue ingrediente base y variante y combina mediante AND todas las selecciones;
- combinación con estado, categoría y etiqueta, conservando OR dentro de categoría o etiqueta y AND entre tipos diferentes;
- resultados paginados, ordenados por relevancia cuando exista consulta textual y con un desempate determinista;
- validación funcional y de rendimiento sobre PostgreSQL real con una biblioteca representativa;
- actualización de contratos, OpenAPI, pruebas y documentación estrictamente afectados.

### Fuera de alcance

- importación asistida y cualquier trabajo de Fase 4 o posterior;
- búsqueda en pasos o notas, fuentes externas, sugerencias mediante IA o corrección semántica generativa;
- stemming, sinónimos, tratamiento específico de singular/plural, errores tipográficos o búsqueda difusa;
- nuevos metadatos, jerarquías o fusiones de ingredientes, categorías o etiquetas;
- eliminación física de recetas;
- rediseño visual general, autenticación, multiusuario, sincronización u offline.

### Migraciones

La migración aditiva de Sprint 3 incorpora `unaccent`, `pg_trgm`, la función `search_normalize` e índices para búsqueda parcial y filtros por ingrediente y variante. Las migraciones anteriores no se reescribieron y la cadena completa se validó desde una base vacía.

### Estrategia de pruebas

- **Aplicación:** ejemplos de coincidencia, relevancia, combinación de filtros, paginación y casos límite acordados en TASK-030.
- **Persistencia:** consultas reales sobre PostgreSQL, igualdad entre filtros y relaciones persistidas, desempates estables y plan de ejecución de los recorridos críticos.
- **API:** validación de parámetros, respuesta paginada, combinaciones admitidas, consultas vacías, ausentes y errores.
- **Web:** buscar, combinar criterios, cambiar de página, limpiar la consulta y recuperar el listado; estados vacío, carga y fallo.
- **Rendimiento:** unas 10.000 recetas con relaciones realistas y generación reproducible; medir el p95 del backend y PostgreSQL, sin navegador ni red, y registrar entorno, dataset y resultado.
- **Regresión:** mantener verdes formato, lint, tipado, pruebas unitarias, integración, e2e, builds y CI, incluidos los recorridos de Sprint 1 y Sprint 2.

### Criterios de aceptación

- El usuario puede localizar recetas por texto e ingredientes desde la biblioteca sin conocer sus identificadores.
- Texto, ingredientes, estado, categorías y etiquetas se combinan conforme a reglas aprobadas y producen resultados reproducibles.
- La búsqueda respeta el comportamiento vigente de recetas activas y archivadas y no modifica datos.
- Los resultados se paginan y ordenan por coincidencia exacta en nombre, parcial en nombre, ingrediente o variante, categoría o etiqueta y descripción; los empates usan nombre normalizado ascendente.
- La API y OpenAPI describen completamente los parámetros y la respuesta sin filtrar detalles de Prisma.
- La interfaz permite aplicar, combinar y limpiar los criterios y comunica ausencia de resultados y errores.
- Las migraciones, si existen, se aplican sobre PostgreSQL vacío y sobre Sprint 2 sin pérdida de datos.
- El p95 de las consultas representativas sobre unas 10.000 recetas es igual o inferior a 300 ms, midiendo solo backend y PostgreSQL, y la evidencia reproducible queda registrada.
- B-006 puede marcarse Finalizado y todas las validaciones obligatorias permanecen verdes.

### Decisiones aprobadas para la implementación

1. **Campos:** nombre, descripción, ingredientes, variantes, categorías y etiquetas; se excluyen pasos y notas.
2. **Coincidencia:** insensible a mayúsculas y acentos, parcial razonable y AND entre palabras aunque aparezcan en campos distintos; sin singular/plural especial, stemming, sinónimos, errores tipográficos ni fuzzy search.
3. **Relevancia:** exacta en nombre, parcial en nombre, ingrediente o variante, categoría o etiqueta y descripción; empate por nombre normalizado ascendente, sin scoring adicional innecesario.
4. **Ingredientes:** el ingrediente base incluye cualquier variante; una variante exige esa variante; varias selecciones y los demás tipos de filtro se combinan mediante AND.
5. **Rendimiento:** unas 10.000 recetas realistas y p95 menor o igual a 300 ms para backend y PostgreSQL, excluyendo navegador y red, con entorno y dataset reproducibles. Cualquier cambio del criterio requiere aprobación del Project Manager.

### Riesgos y coherencia documental

- Los requisitos aprobados completan TASK-030 y permiten implementar y verificar TASK-031 y TASK-032.
- B-006 queda Finalizado al completar los filtros básicos de Sprint 2 y la búsqueda de Sprint 3.
- La búsqueda insensible a acentos y los parciales pueden requerir capacidades e índices específicos de PostgreSQL; deben justificarse y mantenerse reproducibles.
- El benchmark puede variar por hardware y caché; la evidencia debe identificar el entorno y el procedimiento sin convertir el umbral en un contrato permanente del producto.

### Evidencia de TASK-032

Benchmark reproducible ejecutado el 16 de septiembre de 2026 sobre PostgreSQL 17 en Docker Desktop, desde Node.js 24.7.0. El dataset contiene 10.000 recetas, 5 ingredientes, 2 categorías y 3 etiquetas por receta, con 18 consultas de calentamiento y 120 consultas medidas que alternan texto y filtros combinados.

- p50: 89,06 ms;
- p95: 218,29 ms;
- máximo: 219,93 ms;
- criterio aprobado: p95 menor o igual a 300 ms.

La medición abarca el repositorio de aplicación y PostgreSQL; excluye HTTP, red y renderizado. Se reproduce con `DATABASE_URL=... pnpm --filter @cocina-tuda/api benchmark:search` sobre una base destinada a pruebas, cuyo contenido se reemplaza al generar el dataset.
