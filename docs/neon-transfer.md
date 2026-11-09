# Transferencias con Neon: consultas y recargas acotadas

Estado: implementado y verificado localmente; publicación autorizada mediante PR protegida y despliegues de API/web. El resultado de producción se comprueba contra el commit integrado, no se deduce del build local.

## Alcance y criterio

Se reducen resultados enviados desde PostgreSQL a la API y lecturas repetidas provocadas por la web. La transferencia pública de Neon contabiliza el tráfico saliente de la base: devolver menos JSON desde la API no basta si antes se han leído columnas o tablas completas innecesariamente.

No se cambian el esquema, las migraciones, las dependencias, el proveedor, la autenticación ni los datos históricos. No se incorpora caché pública de recetas privadas, almacenamiento persistente en el dispositivo ni un servicio externo de caché. Se mantienen las transacciones, la idempotencia de importación y las validaciones.

Referencia del proveedor: <https://neon.com/docs/introduction/network-transfer>.

## Correcciones

- Recetas: el editor utiliza el detalle completo devuelto por POST/PUT; ya no hace un GET adicional del mismo detalle tras guardar. El listado de biblioteca se refresca para conservar filtros, orden y totales correctos. Crear receta no descarga un listado que no se muestra. Si falla el refresco del listado después de guardar, se informa del fallo de refresco sin presentar el guardado confirmado como fallido.
- Biblioteca y búsqueda: `select` explícito para los campos del resumen y las referencias de clasificación, sin traer notas, autor, metadatos internos ni relaciones que no utiliza el listado. Se conserva la paginación, el total y la relevancia de búsqueda.
- Planificación: su validación consulta únicamente ID, nombre y estado de la receta. La lectura semanal ya estaba acotada por fechas. El detalle se solicita expresamente al abrir la receta.
- Generación de compras: la referencia de receta obtiene raciones e ingredientes, sin pasos, Mambo, notas o clasificaciones. Se mantiene la reutilización de la misma receta dentro de una generación y la instantánea independiente de compras.
- Catálogo: las validaciones de una línea de compra usan búsquedas por los IDs elegidos, con proyecciones pequeñas. No descargan todos los ingredientes, variantes y unidades para validar un elemento. Las referencias opcionales ausentes no provocan consultas.
- Confirmación de importación: las colisiones se buscan por nombre normalizado y las variantes se consultan dentro de su ingrediente. Se conserva la exigencia de seleccionar el elemento existente ante una colisión, sin fusión automática. La propuesta mantiene los listados necesarios para generar sugerencias; la confirmación no vuelve a leerlos enteros por cada referencia.
- Compras: la colección solo consulta metadatos paginados, sin líneas ni procedencias. POST/PUT de una línea devuelve su estado guardado y la web actualiza esa línea; DELETE la retira localmente después de confirmar el éxito. No se vuelve a consultar toda la lista tras cada cambio. Se conservan los borradores de otras líneas y los totales utilizan el estado guardado, no los borradores.
- Unidades: se cargan por separado al entrar en Compras, sin recargarse al generar una lista o pasar de página. «Actualizar listas» vuelve a consultar solo metadatos. «Ver resumen» sigue siendo una consulta explícita del estado guardado completo.

## Contrato del listado de compras

`GET /api/v1/shopping-lists?page=1&pageSize=20` devuelve ahora una colección paginada, no el antiguo array de listas completas:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 0
}
```

Cada elemento contiene `id`, `name`, `sourceFrom`, `sourceTo`, `generatedAt`, `createdAt` y `updatedAt`. No incluye `items` ni `sources` de la lista. El detalle completo se conserva en `GET /api/v1/shopping-lists/:id`.

Valores predeterminados: página 1 y 20 elementos. Página positiva y tamaño entre 1 y 100; se rechazan valores no enteros y paginaciones no seguras. Orden estable por fecha de creación e ID descendentes. Una página fuera del intervalo devuelve `items: []` manteniendo el total real. Swagger y la web se han actualizado con el contrato.

Este cambio de respuesta exige publicar API y web coordinadamente: no es compatible con una web antigua que espere el array anterior. No debe declararse publicado a partir de las pruebas locales.

## Verificación y límites

- Suite unitaria API: 310 pruebas correctas. Las 15 PostgreSQL omitidas en ese comando se ejecutaron por separado, no se contabilizan como aprobadas por omisión.
- Suite web: 142 pruebas correctas.
- PostgreSQL 16 local desechable: siete pruebas de biblioteca/búsqueda y ocho de planificación/compras correctas, más catorce pruebas HTTP de recorrido de producto. Sin omisiones en estas ejecuciones.
- Lint afectado de web, lint API, typecheck API/web y build API/web correctos. Regresiones de proyecciones SQL solicitadas, paginación, colisiones, referencias inválidas, ausencia de GET duplicados, cantidades exactas, cero frente a vacío, Mambo, revisión, borradores y errores de refresco tras una escritura confirmada.
- La base desechable recibió las nueve migraciones existentes; no se creó ninguna migración nueva ni se cargó el `.env` histórico. No se realizaron consultas, escrituras, dumps ni pruebas contra Neon.
- Se observó el aviso de deprecación de pg sobre consultas concurrentes en un cliente; no produjo fallos y no se ha cambiado el driver.

No se ha medido el contador de consumo de Neon ni el tráfico PostgreSQL real en producción. Las pruebas acreditan consultas acotadas y recargas eliminadas, no un porcentaje concreto de ahorro ni una cuota mensual garantizada. El volumen efectivo depende del contenido y de la frecuencia de uso; su comprobación posterior debe hacerse con las métricas del proyecto, sin generar dumps ni cargas artificiales para medirlo.
