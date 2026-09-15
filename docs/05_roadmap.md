# Cocina Tuda — Roadmap

**Versión:** 2.0  
**Estado:** Propuesto  
**Responsable:** Project Manager

## 1. Objetivo

Define el orden de construcción, los resultados esperados y el trabajo técnico conocido. Las tareas podrán dividirse al entrar en un sprint; su identidad se conserva para mantener trazabilidad.

## 2. Fase 0 — Preparación

Resultado: documentación aprobada y repositorio preparado para implementar.

- TASK-001 Auditar y aprobar la documentación.
- TASK-002 Registrar las decisiones arquitectónicas iniciales necesarias.
- TASK-003 Crear el monorepo y su configuración mínima.
- TASK-004 Configurar formato, lint, tipado y pruebas básicas.
- TASK-005 Configurar CI para validar pull requests.
- TASK-006 Documentar instalación y ejecución local.

No incluye PostgreSQL, Prisma ni funcionalidades del producto: se incorporan cuando exista el primer corte vertical que las necesite.

## 3. Fase 1 — Biblioteca mínima

Resultado: una receta puede crearse, consultarse, editarse y archivarse mediante un corte vertical verificable.

- TASK-010 Implementar los conceptos mínimos de receta y paso.
- TASK-011 Implementar catálogo de ingredientes, variantes y unidades.
- TASK-012 Implementar ingredientes de receta.
- TASK-013 Implementar persistencia y migraciones del corte.
- TASK-014 Exponer la API mínima.
- TASK-015 Crear la interfaz mínima y sus pruebas.

## 4. Fase 2 — Clasificación y biblioteca utilizable

Resultado: la biblioteca permite navegar, clasificar y mantener recetas.

- TASK-020 Implementar categorías y etiquetas.
- TASK-021 Completar listado, detalle y edición.
- TASK-022 Aplicar filtros básicos.

## 5. Fase 3 — Búsqueda

Resultado: el usuario localiza recetas por texto, ingredientes, categorías y etiquetas.

- TASK-030 Definir comportamiento y relevancia.
- TASK-031 Implementar búsqueda y filtros combinados.
- TASK-032 Validar rendimiento con una biblioteca representativa.

## 6. Fase 4 — Importación asistida

Resultado: una fuente produce un borrador editable que solo se guarda tras confirmación.

- TASK-040 Definir el contrato independiente del proveedor.
- TASK-041 Extraer propuestas desde texto.
- TASK-042 Incorporar imágenes y documentos.
- TASK-043 Implementar revisión, corrección y confirmación humana.

## 7. Fase 5 — Planificación

Resultado: el usuario asocia cualquier número de recetas con fechas.

- TASK-050 Definir reglas pendientes de planificación.
- TASK-051 Implementar planificación y persistencia.
- TASK-052 Crear experiencia de calendario flexible.

## 8. Fase 6 — Compras

Resultado: el usuario genera y modifica una lista de compra desde una selección planificada.

- TASK-060 Resolver consolidación y unidades.
- TASK-061 Implementar listas y elementos de compra.
- TASK-062 Generar una lista desde planificación.
- TASK-063 Permitir edición y marcado manual.

El MVP concluye al completar las fases 1 a 6 con sus criterios de calidad. Las capacidades posteriores se priorizarán desde el backlog cuando el núcleo esté validado.

