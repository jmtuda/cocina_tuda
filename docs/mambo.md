# Mambo opcional por paso

Estado: revisado y aprobado por el propietario para commit, integración protegida y publicación. Migración y adaptación aditiva de producción ejecutadas y verificadas el 15 de octubre de 2026; la publicación de código se tramita mediante PR y despliegues de Vercel. Evidencia sin contenido privado: [`mambo-production-verification.json`](mambo-production-verification.json). El estado de cada despliegue y su commit se consulta en GitHub/Vercel.

## Uso

Cada paso conserva su texto y puede incluir una sola configuración Mambo. En Crear receta y Editar, «Añadir Mambo al paso…» abre velocidad, temperatura (°C), CT, duración y observaciones del robot; «Quitar Mambo…» la retira. Todos los campos son opcionales. Vacío significa desconocido, no cero. Una configuración completamente vacía se guarda como ausencia y no se muestra al consultar.

La biblioteca y el detalle desde planificación muestran Mambo dentro del mismo elemento numerado del paso. La línea usa el formato «Vel. 1 · 100 °C · CT 6 · 4 m», sin prefijo Mambo ni etiquetas de temperatura o tiempo. La duración se muestra automáticamente en minutos enteros y segundos restantes (90 segundos → 1 m 30 s), sin botón de conversión; los tiempos inferiores a un minuto se muestran en segundos. El editor cambia de unidad conservando el tiempo y acepta minutos decimales solo cuando equivalen a segundos enteros. La configuración se conserva al editar texto, ingredientes, clasificación u otros metadatos.

No se controla ningún robot ni se convierten unidades de ingredientes. Los límites son técnicos (`INTEGER` entre 0 y 2147483647), no una certificación de valores admitidos por un modelo concreto de Mambo.

## Contrato API y persistencia

`POST /api/v1/recipes` y `PUT /api/v1/recipes/:id` admiten pasos con `position`, `text` y `mambo` opcional/anulable. Mambo contiene `speed`, `temperature`, `ct`, `durationSeconds` y `observations`. Los cuatro números son enteros no negativos; cada campo puede omitirse o ser `null`. Las cadenas vacías no son números válidos. Una duración de cuatro minutos se transmite y almacena como `durationSeconds: 240`. Cero se conserva en todos los campos.

La respuesta de detalle devuelve `mambo: null` cuando no hay datos; en caso contrario devuelve el objeto con los campos ausentes nulos. PUT sigue siendo sustitución completa de pasos e ingredientes, no un parche: los clientes deben reenviar las configuraciones existentes para preservarlas. La interfaz lo hace al cargar y guardar cualquier receta. Omitir Mambo en un paso de un PUT lo deja sin configuración; no se infiere a partir de texto histórico.

La migración `apps/api/prisma/migrations/20261015120000_recipe_step_mambo/migration.sql` añade cinco columnas anulables a `recipe_steps` y cuatro restricciones de no negatividad. No añade tablas, pasos, valores por defecto ni transformaciones de contenido. El cliente Prisma generado se incluye con el cambio.

## Importación y revisión

Gemini y OpenAI comparten esquema estructurado e instrucciones para proponer objetos de paso con texto y configuración. Por ejemplo:

    Añadimos un chorro de aceite y sofreímos.
    Vel.:1/// Temp.:100/// CT:6/// Tiempo:4m

Se solicita una sola propuesta de paso con `speed: 1`, `temperature: 100`, `ct: 6`, `durationSeconds: 240`, no dos pasos numerados. No se inventan parámetros ausentes, los ceros explícitos no se convierten en ausencia y las dudas se conservan para revisión. Las respuestas se validan antes de ofrecerlas.

En revisión se puede añadir, modificar y quitar Mambo, además de elegir «Asociar Mambo del paso… a». Si el destino ya tiene configuración, se intercambian ambas sin sobrescribir datos. El texto de los pasos no se mueve; la confirmación usa su orden actual. Se mantiene el consentimiento previo al envío y la confirmación transaccional idempotente.

El endpoint de confirmación sigue aceptando pasos antiguos como cadenas y también objetos `{ text, mambo }`. Los borradores locales anteriores con pasos de texto se normalizan en memoria sin descartarlos. Los proveedores nuevos reciben el esquema de objetos; la compatibilidad de cadenas se mantiene al leer respuestas antiguas y confirmar borradores.

Las pruebas de proveedores usan respuestas controladas, no llamadas reales: comprueban esquema, instrucciones, parseo y transferencia de parámetros, pero no garantizan que un modelo interprete cualquier fuente correctamente. Antes de publicar debe probarse una fuente sintética con cada proveedor, con consentimiento y credenciales del servidor. Nunca usar automáticamente recetas privadas para esa prueba.

## Verificación aislada

Se utilizó exclusivamente un contenedor local efímero `postgres:16`, enlazado a loopback, con datos sintéticos y credenciales públicas de prueba. `DATABASE_URL` y `TEST_POSTGRES_URL` apuntaron explícitamente a esa base y `DOTENV_CONFIG_PATH=/dev/null` evitó cargar el `.env` histórico.

El contenedor se detuvo y eliminó tras las comprobaciones; no se dejó una base persistente ni se cambiaron los procesos previos de la aplicación.

- Aplicación de las siete migraciones con Prisma correcta sobre base vacía.
- Actualización separada desde las seis migraciones anteriores, con un paso sintético que contenía la línea de parámetros: texto, ID, receta y posición idénticos; los cinco campos nuevos permanecieron nulos. No hubo conversión automática.
- `test:postgres`: 10 pruebas de repositorios y 13 HTTP e2e correctas, ninguna omitida. Incluyen ceros, vacío/nulo, edición de otros datos, retirada, confirmación mixta antigua/nueva, asociación corregida, idempotencia y rechazo de valores inválidos sin persistir.
- Web: 95 pruebas correctas; lint, typecheck y build correctos. Casos de biblioteca, creación, edición, revisión de importación, detalle desde planificación y conversión de unidades sin perder segundos.

El conjunto de verificación final y sus límites se registra también en `PROJECT_STATUS.md`. Estas comprobaciones no acreditan despliegue, llamadas IA reales ni revisión visual manual del propietario.

## Orden de publicación y verificaciones

1. Revisión local aprobada por el propietario. Prisma selecciona las nuevas columnas también al consultar pasos, por lo que la migración precede a la API nueva.
2. Crear commit/PR, pasar `validate` y respetar las protecciones. No incluir el cambio local ajeno de `AGENTS.md` sin decisión expresa del propietario.
3. Con la autorización expresa de publicación/adaptación, se verificó el destino, se creó y restauró una copia reciente y se aplicó la migración aditiva antes de publicar. La versión anterior ignora las columnas nuevas. No ejecutar pruebas, seed ni benchmark en producción.
4. Publicar API y web coordinadamente manteniendo Vercel Authentication y secretos solo en producción API. Los endpoints de propuesta nuevos usan objetos de paso: evitar servir una revisión de importación antigua contra la API nueva (incluidas pestañas abiertas; recargar antes de importar). No añadir migraciones automáticas al build de Vercel.
5. Verificar lectura, una receta de prueba expresamente autorizada, edición y ambas importaciones; no alterar recetas históricas como smoke test. Registrar resultados y retirar solo los datos de prueba autorizados.

## Adaptación de las recetas existentes

La migración por sí sola deja todas las recetas tal como están. Posteriormente, el propietario autorizó expresamente una adaptación puntual, conservando todos los pasos antiguos para borrarlos manualmente si lo desea.

Se añadieron 45 configuraciones en 19 recetas: 44 líneas de parámetros completas se asociaron al paso culinario inmediatamente anterior y un bloque inline al mismo paso. No hubo creación, eliminación, renumeración ni edición de texto de pasos: permanecen los 472 pasos. Solo se actualizaron las cinco columnas Mambo nuevas. Las huellas de todas las columnas anteriores de las 16 tablas de aplicación coincidieron antes/después, y la lectura posterior al commit verificó cada configuración.

Se conservaron ceros explícitos y se convirtieron únicamente duraciones con unidad inequívoca o formato HH:MM:SS. En seis casos el tiempo original no tenía unidad: `durationSeconds` quedó nulo y el valor original se conservó en observaciones del robot para revisión manual. No se infirieron segundos ni minutos. El resto de texto libre quedó intacto. La operación se ensayó sobre la copia restaurada, se aplicó en una transacción con bloqueo de tablas y no sobrescribió configuraciones existentes; un segundo plan no propone escrituras nuevas.

El propietario puede revisar cada receta en Editar, corregir las seis duraciones pendientes y eliminar personalmente las líneas antiguas redundantes. No se ha añadido un importador, endpoint ni conversor histórico permanente; el script puntual y la trazabilidad privada permanecen ignorados, junto a la copia local privada. No reimportar la biblioteca ni repetir la operación sin otro encargo.
