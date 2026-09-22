# Cocina Tuda — Sprint actual

**Versión:** 7.2

**Estado:** Activo — implementación lista para revisión

**Responsable:** Project Manager

## Sprint 5 — Planificación flexible de comidas

### Objetivo

Completar B-009 para que el usuario pueda asociar cualquier número de recetas de su biblioteca a fechas, con una denominación de comida opcional, y gestionar esas asociaciones sin copiar ni modificar las recetas.

La planificación referencia siempre la receta vigente. No crea versiones, no altera la biblioteca y no anticipa la lista de la compra.

### Alcance implementado

| Orden | Tarea    | Resultado verificable                                                      | Estado      | Depende de |
| ----- | -------- | -------------------------------------------------------------------------- | ----------- | ---------- |
| 1     | TASK-050 | Reglas pendientes de planificación resueltas y contratos definidos         | En revisión | Sprint 4   |
| 2     | TASK-051 | Planificación y persistencia con referencias a la biblioteca implementadas | En revisión | 050        |
| 3     | TASK-052 | Experiencia de calendario para consultar y gestionar comidas               | En revisión | 051        |

TASK-050–TASK-052 son el alcance real de Fase 5 según el roadmap vigente y completan B-009. B-010 y la generación de compras pertenecen a Fase 6.

### Dependencias y orden

1. Resolver las decisiones funcionales de TASK-050, especialmente el tratamiento de recetas archivadas.
2. Definir el contrato público mínimo entre `planning` y `library`, sin acceso a repositorios ni tablas internas.
3. Incorporar el modelo, los casos de uso y la persistencia de comidas planificadas.
4. Publicar la API y construir la experiencia de calendario sobre esos contratos.
5. Validar el recorrido completo y la regresión de biblioteca, catálogo, búsqueda e importación.

## Flujo funcional

1. El usuario abre la planificación y navega a un intervalo de fechas.
2. Selecciona una fecha y una receta activa de la biblioteca.
3. Puede añadir una denominación libre y opcional, como «desayuno», «comida» o «cena».
4. Confirma y se crea una asociación de planificación; la receta no se copia ni se modifica.
5. La vista muestra las comidas agrupadas por fecha y permite días vacíos y varias comidas el mismo día.
6. El usuario puede cambiar fecha, receta o denominación, abrir la receta referenciada y retirar una asociación.
7. Cualquier vista posterior refleja el estado y contenido vigentes de la receta referenciada.

La retirada elimina únicamente la asociación de planificación. No archiva ni elimina la receta.

## Modelo y reglas propuestas

`PlannedMeal` pertenece a `planning` y contiene:

- identificador propio;
- referencia obligatoria a una receta existente;
- fecha de calendario, sin hora;
- denominación de comida opcional;
- metadatos técnicos de creación y actualización.

Reglas:

- una fecha puede no contener comidas o contener cualquier número de ellas;
- una comida planificada referencia una receta, pero no conserva una copia de sus datos;
- la denominación es texto libre, opcional y sin catálogo en esta fase;
- una denominación presente no puede quedar vacía tras normalizar espacios;
- el orden de presentación será determinista, sin incorporar ordenación manual en este sprint;
- se permiten varias planificaciones idénticas porque cada una tiene identidad propia;
- archivar una receta conserva sus planificaciones, que continúan mostrando y permitiendo consultar la receta actual;
- una receta archivada no está disponible normalmente para una planificación nueva y vuelve a estarlo al reactivarse.

## Cambios previstos por capa

- **Dominio:** entidad `PlannedMeal`, fecha y denominación opcional con sus invariantes; ninguna regla de catálogo, búsqueda o importación pasa a este módulo.
- **Aplicación:** casos de uso para crear, consultar por intervalo, actualizar y retirar asociaciones; validación de la receta mediante un contrato público de `library`.
- **Persistencia:** repositorio de planificación y migración PostgreSQL para `planned_meals`, con clave foránea restrictiva a `recipes`, fecha `DATE` e índices por fecha y receta. No existirá restricción de unicidad entre fecha, receta y denominación.
- **API:** contratos versionados para listar por intervalo y crear, actualizar o retirar comidas; validación de fechas, identificadores, límites de intervalo y errores coherentes con la API existente.
- **Interfaz:** módulo `planning`, navegación temporal, días vacíos, alta/edición/retirada y selección de recetas usando capacidades públicas existentes.

`planning` podrá consumir una proyección pública mínima de receta —identificador, nombre y estado—, pero no dependerá de Prisma, de repositorios internos de `library` ni de detalles de búsqueda. No se requieren cambios en el dominio de receta ni en importación.

### Migración prevista

La migración añadirá `planned_meals` con identificador UUID, `recipe_id`, `planned_date`, denominación nullable y marcas de tiempo. La clave foránea no tendrá eliminación en cascada. Se crearán índices para consultas por intervalo y para localizar referencias a una receta.

No se incorporan tablas de calendario, franjas horarias, plantillas, recurrencia, historial ni compras.

## Estrategia de pruebas

- **Dominio:** fecha válida, denominación ausente o normalizada e invariantes de la entidad.
- **Aplicación:** crear, consultar intervalos, actualizar y retirar; varios elementos por día, duplicados exactos, días vacíos, receta inexistente, archivo posterior y reactivación de recetas.
- **Persistencia/PostgreSQL:** migración desde una base vacía, clave foránea, tipo `DATE`, consultas inclusivas por intervalo, índices y recorrido escritura–lectura.
- **API:** contratos y códigos de error, intervalos inválidos o excesivos, UUID inválido y operaciones sobre asociaciones inexistentes.
- **Interfaz:** semana inicial, navegación anterior/posterior y a una fecha concreta, estados vacío/error/carga, selección de receta, alta, edición, retirada y apertura de la receta referenciada.
- **Integración:** creación de receta → planificación → edición de receta → lectura actualizada desde planificación; archivo/reactivación según la regla aprobada.
- **Fechas:** conservar exactamente fechas como `2026-09-21` con zonas horarias representativas distintas, sin convertirlas a instantes.
- **Regresión:** mantener verdes catálogo, biblioteca, búsqueda, importación, migraciones acumuladas, lint, tipado, pruebas y builds.

## Criterios de aceptación

- El usuario puede consultar un intervalo y distinguir claramente días vacíos y días con comidas.
- Puede asociar varias recetas a una misma fecha, con o sin denominación, y gestionarlas posteriormente.
- Planificar no crea copias ni modifica recetas, categorías, etiquetas o ingredientes.
- Editar una receta se refleja al volver a consultarla desde planificación.
- Las referencias inválidas se rechazan; una receta archivada no se ofrece normalmente para crear o reemplazar una planificación, pero sus asociaciones existentes se conservan y permiten consultarla.
- Retirar una comida no afecta a la receta y no deja relaciones huérfanas.
- Fechas y cambios de día no sufren desplazamientos por zona horaria.
- La migración completa funciona sobre PostgreSQL vacío y el recorrido aplicación–persistencia–lectura queda cubierto.
- La API, la interfaz y la documentación representan las mismas reglas y todas las validaciones obligatorias permanecen verdes.

## Fuera de alcance

- generación, edición o exportación de listas de compra (B-010 y Fase 6);
- agregación de cantidades, conversiones de unidades o cálculo de raciones;
- horas, franjas horarias controladas, duración, recordatorios o notificaciones;
- recurrencia, plantillas, copiar semanas o planificación automática;
- notas propias de la planificación, comensales u objetivos nutricionales;
- ordenación manual mediante arrastre;
- recomendaciones o generación mediante IA;
- autenticación, multiusuario, sincronización u offline;
- cambios en catálogo, relevancia de búsqueda o flujo de importación.

## Decisiones técnicas delegadas

Una vez aprobadas las reglas funcionales, el equipo técnico podrá decidir:

- límites razonables y valor predeterminado del intervalo consultable;
- DTO y rutas exactas, respetando el versionado y convenciones existentes;
- índice y orden determinista exactos para elementos de una misma fecha;
- control de concurrencia coherente con el patrón actual;
- presentación visual mínima del calendario y selector reutilizable de recetas;
- límites de longitud y mensajes de validación de la denominación libre.

## Decisiones funcionales aprobadas

1. **Recetas archivadas.** Archivar una receta conserva intactas sus planificaciones y permite seguir consultando la receta desde ellas. La receta archivada no se ofrece normalmente para nuevas planificaciones; al reactivarla vuelve a estar disponible.
2. **Vista temporal inicial.** La interfaz comienza en una semana, permite navegar a semanas anteriores y posteriores y alcanzar cualquier fecha. Los días vacíos y cualquier número de comidas por día son válidos. Esto no limita el dominio a semanas.
3. **Duplicados exactos.** Se permiten varias planificaciones con la misma fecha, receta y denominación. No existe una unicidad equivalente y cada `PlannedMeal` tiene identidad propia.
4. **Retirada.** Retirar una planificación elimina definitivamente solo esa asociación. No existen historial, papelera, archivado, borrado lógico ni auditoría funcional de `PlannedMeal`.
5. **Referencia a receta.** La planificación referencia la receta y usa siempre su contenido y estado actuales; no guarda snapshots ni versiones.
6. **Fecha.** Representa un día de calendario y se conserva como `YYYY-MM-DD`/`DATE` entre interfaz, API, aplicación y persistencia, sin conversiones de zona horaria.
7. **Denominación.** Es texto libre y opcional; no forma un catálogo ni un tipo de comida obligatorio.

## Riesgos y contradicciones

- Usar instantes en lugar de fechas de calendario produciría desplazamientos por zona horaria; el contrato deberá conservar semántica `DATE` de extremo a extremo.
- El selector puede acoplar planificación a detalles internos de búsqueda o biblioteca; se limitará a contratos públicos y proyecciones estables.
- Una futura lista de compra necesitará recorrer la planificación, pero no justifica anticipar agregación, snapshots ni estructuras de compras en este sprint.
- No se detectan decisiones funcionales pendientes ni contradicciones entre roadmap, backlog y producto actual: Fase 5 corresponde a TASK-050–TASK-052 y B-009; Fase 6 permanece pendiente.

## Evidencia de implementación

- La migración acumulada se aplicó desde una base PostgreSQL 16 vacía y produjo `planned_meals` con fecha `DATE`, clave foránea restrictiva e índices por fecha y receta.
- Las pruebas reales cubren escritura, lectura por intervalo, duplicados exactos, edición, retirada física y el estado actual de una receta archivada o reactivada.
- El recorrido HTTP confirma que una receta archivada conserva sus planificaciones, no acepta otras nuevas y vuelve a admitirlas tras reactivarse.
- Las pruebas de dominio e interfaz protegen `2026-09-21` como día de calendario sin conversiones locales, además de la navegación semanal y los días vacíos.
- La implementación no incorpora compras, vistas adicionales, snapshots, historial ni dependencias de Fase 6.
