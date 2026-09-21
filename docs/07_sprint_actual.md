# Cocina Tuda — Sprint actual

**Versión:** 7.0

**Estado:** Propuesto

**Responsable:** Project Manager

## Sprint 5 — Planificación flexible de comidas

### Objetivo

Completar B-009 para que el usuario pueda asociar cualquier número de recetas de su biblioteca a fechas, con una denominación de comida opcional, y gestionar esas asociaciones sin copiar ni modificar las recetas.

La planificación referencia siempre la receta vigente. No crea versiones, no altera la biblioteca y no anticipa la lista de la compra.

### Alcance propuesto

| Orden | Tarea    | Resultado verificable                                                      | Estado    | Depende de |
| ----- | -------- | -------------------------------------------------------------------------- | --------- | ---------- |
| 1     | TASK-050 | Reglas pendientes de planificación resueltas y contratos definidos         | Propuesta | Sprint 4   |
| 2     | TASK-051 | Planificación y persistencia con referencias a la biblioteca implementadas | Propuesta | 050        |
| 3     | TASK-052 | Experiencia de calendario para consultar y gestionar comidas               | Propuesta | 051        |

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
- el comportamiento ante recetas archivadas se aplicará según la decisión del PM previa a la implementación.

## Cambios previstos por capa

- **Dominio:** entidad `PlannedMeal`, fecha y denominación opcional con sus invariantes; ninguna regla de catálogo, búsqueda o importación pasa a este módulo.
- **Aplicación:** casos de uso para crear, consultar por intervalo, actualizar y retirar asociaciones; validación de la receta mediante un contrato público de `library`.
- **Persistencia:** repositorio de planificación y migración PostgreSQL para `planned_meals`, con clave foránea restrictiva a `recipes`, fecha `DATE` e índices por fecha y receta. No se prevé una restricción de unicidad entre fecha, receta y denominación mientras el PM no decida lo contrario.
- **API:** contratos versionados para listar por intervalo y crear, actualizar o retirar comidas; validación de fechas, identificadores, límites de intervalo y errores coherentes con la API existente.
- **Interfaz:** módulo `planning`, navegación temporal, días vacíos, alta/edición/retirada y selección de recetas usando capacidades públicas existentes.

`planning` podrá consumir una proyección pública mínima de receta —identificador, nombre y estado—, pero no dependerá de Prisma, de repositorios internos de `library` ni de detalles de búsqueda. No se requieren cambios en el dominio de receta ni en importación.

### Migración prevista

La migración añadirá `planned_meals` con identificador UUID, `recipe_id`, `planned_date`, denominación nullable y marcas de tiempo. La clave foránea no tendrá eliminación en cascada. Se crearán índices para consultas por intervalo y para localizar referencias a una receta.

No se incorporan tablas de calendario, franjas horarias, plantillas, recurrencia, historial ni compras.

## Estrategia de pruebas

- **Dominio:** fecha válida, denominación ausente o normalizada e invariantes de la entidad.
- **Aplicación:** crear, consultar intervalos, actualizar y retirar; varios elementos por día, días vacíos, receta inexistente y política aprobada para recetas archivadas.
- **Persistencia/PostgreSQL:** migración desde una base vacía, clave foránea, tipo `DATE`, consultas inclusivas por intervalo, índices y recorrido escritura–lectura.
- **API:** contratos y códigos de error, intervalos inválidos o excesivos, UUID inválido y operaciones sobre asociaciones inexistentes.
- **Interfaz:** navegación entre fechas, estados vacío/error/carga, selección de receta, alta, edición, retirada y apertura de la receta referenciada.
- **Integración:** creación de receta → planificación → edición de receta → lectura actualizada desde planificación; archivo/reactivación según la regla aprobada.
- **Regresión:** mantener verdes catálogo, biblioteca, búsqueda, importación, migraciones acumuladas, lint, tipado, pruebas y builds.

## Criterios de aceptación

- El usuario puede consultar un intervalo y distinguir claramente días vacíos y días con comidas.
- Puede asociar varias recetas a una misma fecha, con o sin denominación, y gestionarlas posteriormente.
- Planificar no crea copias ni modifica recetas, categorías, etiquetas o ingredientes.
- Editar una receta se refleja al volver a consultarla desde planificación.
- Las referencias inválidas y las operaciones no permitidas sobre recetas archivadas se rechazan de forma explícita conforme a la decisión aprobada.
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

## Decisiones funcionales pendientes del PM

1. **Recetas archivadas.** La documentación exige decidir su comportamiento. Propuesta: conservar y mostrar las asociaciones existentes con el estado archivado, permitir abrirlas y cambiar fecha o denominación, impedir seleccionar una receta archivada en nuevas asociaciones o como reemplazo, y recuperarla automáticamente como seleccionable al reactivarla.
2. **Vista temporal inicial.** El roadmap exige una experiencia de calendario flexible, pero no fija la granularidad. Propuesta: vista semanal como predeterminada, navegación por semanas y acceso directo a cualquier fecha; no incluir vista mensual en Sprint 5.
3. **Duplicados exactos.** Debe decidirse si la misma receta puede aparecer más de una vez en la misma fecha con igual denominación. Propuesta: permitirlo, porque cada asociación representa una comida independiente y el dominio admite cualquier número por día; no crear una unicidad que luego limite usos legítimos.
4. **Retirada de una planificación.** Propuesta: eliminación definitiva de la asociación, con confirmación visible en la interfaz y sin historial o papelera; la receta referenciada no se altera.

## Riesgos y contradicciones

- La regla de recetas archivadas es el único bloqueo funcional explícito ya registrado en el modelo de dominio y debe resolverse antes de TASK-051.
- Usar instantes en lugar de fechas de calendario produciría desplazamientos por zona horaria; el contrato deberá conservar semántica `DATE` de extremo a extremo.
- El selector puede acoplar planificación a detalles internos de búsqueda o biblioteca; se limitará a contratos públicos y proyecciones estables.
- Una futura lista de compra necesitará recorrer la planificación, pero no justifica anticipar agregación, snapshots ni estructuras de compras en este sprint.
- No se detectan contradicciones entre roadmap, backlog y producto actual: Fase 5 corresponde a TASK-050–TASK-052 y B-009; Fase 6 permanece pendiente.
