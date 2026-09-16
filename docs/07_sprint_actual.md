# Cocina Tuda — Sprint actual

**Versión:** 4.0

**Estado:** Propuesto

**Responsable:** Project Manager

## Sprint 3 — Búsqueda

### Objetivo

Completar B-006 para que el usuario localice recetas por texto e ingredientes, combinando esos criterios con los filtros de estado, categoría y etiqueta ya disponibles, con un comportamiento de relevancia explícito y rendimiento validado sobre una biblioteca representativa.

Sprint 1 y Sprint 2 están finalizados. Sprint 3 no está activo y no se ha implementado funcionalidad de Fase 3.

### Alcance propuesto

| Orden | Tarea    | Resultado verificable                                                              | Estado    | Depende de |
| ----- | -------- | ---------------------------------------------------------------------------------- | --------- | ---------- |
| 1     | TASK-030 | Reglas aprobadas de consulta, coincidencia, combinación, relevancia y casos límite | Propuesta | Sprint 2   |
| 2     | TASK-031 | Búsqueda por texto e ingredientes integrada con filtros y paginación existentes    | Propuesta | 030        |
| 3     | TASK-032 | Rendimiento medido y aceptado con una biblioteca representativa                    | Propuesta | 031        |

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

- búsqueda de recetas por el texto y los campos que apruebe el Project Manager;
- filtro por ingredientes con la semántica que se apruebe;
- combinación con estado, categoría y etiqueta, conservando OR dentro de categoría o etiqueta y AND entre tipos diferentes;
- resultados paginados, ordenados por relevancia cuando exista consulta textual y con un desempate determinista;
- validación funcional y de rendimiento sobre PostgreSQL real con una biblioteca representativa;
- actualización de contratos, OpenAPI, pruebas y documentación estrictamente afectados.

### Fuera de alcance

- importación asistida y cualquier trabajo de Fase 4 o posterior;
- búsqueda en fuentes externas, sugerencias mediante IA o corrección semántica generativa;
- nuevos metadatos, jerarquías o fusiones de ingredientes, categorías o etiquetas;
- eliminación física de recetas;
- rediseño visual general, autenticación, multiusuario, sincronización u offline.

### Migraciones

No se presupone una migración concreta antes de aprobar el comportamiento y medir la solución. Si la implementación necesita índices, extensiones o estructuras auxiliares de PostgreSQL, se incorporarán mediante una migración nueva, nunca reescribiendo las existentes, y se justificará su compatibilidad con los entornos documentados.

### Estrategia de pruebas

- **Aplicación:** ejemplos de coincidencia, relevancia, combinación de filtros, paginación y casos límite acordados en TASK-030.
- **Persistencia:** consultas reales sobre PostgreSQL, igualdad entre filtros y relaciones persistidas, desempates estables y plan de ejecución de los recorridos críticos.
- **API:** validación de parámetros, respuesta paginada, combinaciones admitidas, consultas vacías, ausentes y errores.
- **Web:** buscar, combinar criterios, cambiar de página, limpiar la consulta y recuperar el listado; estados vacío, carga y fallo.
- **Rendimiento:** datos reproducibles con volumen y distribución aprobados; medición de consultas representativas contra un umbral acordado, registrando entorno y resultado.
- **Regresión:** mantener verdes formato, lint, tipado, pruebas unitarias, integración, e2e, builds y CI, incluidos los recorridos de Sprint 1 y Sprint 2.

### Criterios de aceptación

- El usuario puede localizar recetas por texto e ingredientes desde la biblioteca sin conocer sus identificadores.
- Texto, ingredientes, estado, categorías y etiquetas se combinan conforme a reglas aprobadas y producen resultados reproducibles.
- La búsqueda respeta el comportamiento vigente de recetas activas y archivadas y no modifica datos.
- Los resultados se paginan y mantienen un orden estable; cuando procede, la relevancia sigue ejemplos aprobados.
- La API y OpenAPI describen completamente los parámetros y la respuesta sin filtrar detalles de Prisma.
- La interfaz permite aplicar, combinar y limpiar los criterios y comunica ausencia de resultados y errores.
- Las migraciones, si existen, se aplican sobre PostgreSQL vacío y sobre Sprint 2 sin pérdida de datos.
- Los recorridos representativos cumplen el objetivo de rendimiento aprobado y la evidencia queda registrada.
- B-006 puede marcarse Finalizado y todas las validaciones obligatorias permanecen verdes.

### Decisiones pendientes del Project Manager

1. **Campos de texto:** concretar si la consulta abarca solo nombre o también descripción, autor, notas, pasos y nombres de ingredientes/variantes. Categorías y etiquetas ya son filtros explícitos.
2. **Coincidencia:** definir tratamiento de acentos, palabras parciales, varias palabras, plurales y errores tipográficos, incluido el mínimo de caracteres y la consulta vacía.
3. **Relevancia:** establecer prioridades entre campos y tipos de coincidencia, y el desempate; confirmar si sin texto se conserva el orden por nombre normalizado.
4. **Ingredientes:** decidir si se filtra por ingrediente base, variante o ambos, y si seleccionar varios ingredientes exige cualquiera de ellos (OR) o todos (AND).
5. **Rendimiento:** fijar tamaño y distribución de la biblioteca representativa, consultas críticas y tiempo de respuesta aceptable en el entorno de referencia.

### Riesgos y coherencia documental

- El roadmap menciona texto, ingredientes, categorías y etiquetas, pero no define los cinco puntos anteriores; TASK-030 debe resolverlos antes de implementar.
- B-006 figura En desarrollo porque Sprint 2 entregó sus filtros básicos; se cerrará únicamente tras completar la búsqueda de esta fase.
- Añadir tolerancia tipográfica o lingüística puede requerir capacidades específicas de PostgreSQL y condicionar migraciones y despliegue.
- La medición de TASK-032 no será concluyente sin un conjunto de datos y umbral previamente acordados.
