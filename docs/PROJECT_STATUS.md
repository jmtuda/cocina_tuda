# Estado del proyecto y traspaso a Hermes

Fecha de revisión: 7 de octubre de 2026. El traspaso inicial contrastó `origin/main` en `6ce24b3911dfd4cafb91ed756a60badff4beefd0`; antes de la transferencia a Neon se comprobó el checkout limpio y sincronizado en `18e723b5e4cd6595974be422c0a2a34a7661a288`. La configuración y la evidencia de transferencia se entregan mediante PR; las credenciales permanecen exclusivamente en el archivo local ignorado por Git. Este documento registra hechos observados; no convierte conversaciones en evidencia de implementación.

## Estado real y último trabajo

El MVP B-001–B-010 está implementado, con los seis sprints cerrados en la documentación. La PR #32 está **MERGED** desde el 3 de octubre de 2026, con ese mismo commit de integración. Añade revisión de importación compacta, campos obligatorios y acciones pendientes claras. No había PR ni commits posteriores en GitHub al iniciar este traspaso.

Las PR #29–#31 ya integradas incorporan visibilidad de persistencia/navegación compacta, consulta y edición de recetas en modal con control de foco, y aprobación explícita del catálogo durante importación.

El checkout local comenzó limpio, sin archivos no versionados pendientes, sin stashes y sin ramas locales fuera de `origin/main`; sus cuatro ramas de correcciones están integradas. Los archivos ignorados son dependencias, cachés, compilaciones y metadatos del sistema. No se encontró trabajo de producto pendiente en este checkout. Solo hay un worktree registrado.

Este traspaso incorpora guía de agentes, estado operativo y correcciones del README/índice. También fija el reloj y corrige una espera asíncrona en la prueba de planificación; no cambia comportamiento funcional.

## Funcionalidades terminadas

- Biblioteca: alta, consulta, edición y archivo de recetas; pasos, ingredientes, cantidades, variantes y clasificación. Modal de detalle/edición.
- Catálogo: ingredientes, variantes, unidades, categorías y etiquetas con normalización y validaciones.
- Búsqueda y filtrado de recetas, con persistencia PostgreSQL e índices propios.
- Importación asistida desde texto, JPEG/PNG/WebP, PDF y DOCX; extracción, consentimiento, propuesta, revisión y confirmación. Adaptadores Gemini y OpenAI.
- Catálogo propuesto revisable; creación explícita y colisiones sin fusión automática. Receta y catálogo se confirman en una transacción; `ImportConfirmation` evita duplicados del mismo identificador de importación.
- Planificación semanal con altas y retirada de comidas.
- Compras: generación por intervalo con exclusiones, consolidación compatible y suma decimal exacta, edición de líneas, altas manuales y marcado de compra.
- API versionada, health, Swagger, seis migraciones y CI `validate`.

## Parcial, pendiente y limitaciones

No se ha identificado una funcionalidad del MVP declarada parcial en el código revisado. Su disponibilidad en una instancia concreta depende de DB, migraciones y configuración de IA; no queda certificada por las pruebas sin PostgreSQL.

**Base histórica recuperada y copiada a Neon.** El propietario aportó evidencia documental de la carga XLSX y de sus respaldos en frío y `pg_dump`; esos backups no se inspeccionaron ni modificaron. Se verificaron independientemente 85 recetas, 675 líneas de ingredientes, 471 pasos y 85 confirmaciones de importación en la instancia local recuperada. Los recuentos respaldan la conservación de los datos; la atribución al XLSX procede de la evidencia del propietario, no de un campo de archivo fuente en el esquema. No repetir la importación.

## Transferencia a Neon — 7 de octubre de 2026

- Destino autorizado: proyecto `cocina-tuda-pg16`, ID `calm-butterfly-64933476`, rama `production`, ID `br-morning-rain-b1ixq8dj`, base `cocina_tuda`, PostgreSQL 16.15, Frankfurt, plan Free comprobado en el panel. No se activaron servicios adicionales ni planes de pago. El proyecto inicial incorrecto PostgreSQL 18 (`cold-truth-35056944`) se eliminó con autorización explícita y se comprobó su ausencia.
- Origen: contenedor existente `cocina-tuda-postgres`, PostgreSQL 16.14, base `cocina_tuda`, volumen persistente. La conexión cliente con Neon se verificó con TLS 1.3.
- Copia: `pg_dump` completo desde un snapshot exportado en una transacción de origen `REPEATABLE READ READ ONLY`; restauración atómica en el destino previamente comprobado vacío. Sin exportar propietarios ni ACL locales: los objetos restaurados pertenecen al rol de Neon. No se ejecutó `prisma migrate deploy`, ninguna importación XLSX, `test:postgres` ni benchmark.
- Verificación: las filas completas de las 17 tablas, incluidas las vacías, coinciden por SHA-256 entre origen y destino. Coinciden también columnas, tipos, defaults, restricciones, índices, funciones y versiones de extensiones (`pg_trgm`, `unaccent`, `plpgsql`). Las seis migraciones están finalizadas, no revertidas y sus checksums coinciden con los archivos del repositorio. El origen no cambió durante la copia y el snapshot se cerró.
- Recuentos de Neon: 85 recetas, 675 líneas de ingredientes, 471 pasos, 85 confirmaciones de importación, 111 ingredientes, 104 variantes, 28 unidades, 15 categorías, 3 etiquetas y 2 listas de compra. No hay comidas planificadas. También se conservaron las tablas de relaciones y procedencia de compras.
- Configuración local autorizada: conexión de servidor en `apps/api/.env`, ignorada por Git y con permisos `600`; sin `TEST_POSTGRES_URL`. La API carga dotenv antes de arrancar. No se publican credenciales, archivos fuente ni dumps en el repositorio.
- La base local permanece intacta como respaldo previo al cambio; no existe sincronización entre las dos instancias. Los nuevos cambios de la aplicación configurada para Neon se guardarán únicamente en Neon. API y web siguen siendo locales/de confianza, no un despliegue público.
- Verificación del arranque: cliente Node/pg conectado a Neon 16.15 desde `apps/api/.env`; API compilada arrancada temporalmente con sesiones DB de solo lectura. Health, listado de las 85 recetas y detalle de una receta devolvieron HTTP 200 mediante GET. El proceso de comprobación se detuvo al terminar. Las filas de origen y destino seguían idénticas tras todas las comprobaciones.
- Regresión actual: formato, lint, typecheck y build correctos, ejecutados secuencialmente y sin caché de Turbo para las tareas aplicables. API: 60 pruebas correctas y 9 PostgreSQL omitidas; web: 20 correctas; HTTP e2e: 2 correctas y 11 PostgreSQL omitidas. La prueba de carga de entorno falló antes de añadir dotenv y pasó después; otra prueba comprueba la prioridad de las variables del proceso.
- Entorno actual: Node 26.7.0 y pnpm 11.19.0. El primer intento web falló porque el almacenamiento nativo de Node 26 interfería con jsdom; la prueba acotada y la suite completa pasaron con `NODE_OPTIONS=--no-experimental-webstorage` solo para el proceso de tests, sin cambiar código web. No se considera validado el comando de tests sin ese ajuste en Node 26.
- Evidencia técnica sin credenciales ni datos de recetas: [`neon-transfer-verification.json`](neon-transfer-verification.json), con recuentos y huellas SHA-256 por tabla, comparación de esquema y resultados de comprobación. Es una instantánea del momento de la verificación, no un indicador dinámico del estado de publicación ni de futuros datos.

Pendientes del backlog: B-020 variantes/grupos de recetas y B-021 cuentas/propiedad multiusuario; después offline/sincronización, inventario, nutrición/escalado, recomendaciones, colaboración y favoritos/colecciones/estadísticas. No hay un nuevo sprint activo aprobado.

Limitaciones observadas: sin autenticación ni separación multiusuario; CORS habilitado; proxy web fijado a API local en 3001; sin conversión de unidades ni escalado de raciones; listas de compra independientes que no se recalculan al editar recetas, y sin borrado de listas completas. No se probó un proveedor IA real ni un recorrido manual en navegador en esta revisión. Los tests de proveedor usan respuestas simuladas. CI no configura PostgreSQL y omite esas pruebas.

## Decisiones técnicas vigentes

Monolito modular NestJS con contratos públicos entre módulos, Next/React como cliente, PostgreSQL y Prisma como persistencia. No se requiere una infraestructura de microservicios. La biblioteca conserva recetas; planificación referencia recetas; compras conserva una instantánea con procedencia. Cantidades decimales y ausencia de cantidad tienen semántica distinta. La IA propone y la persona confirma; no se conserva el archivo fuente como dato permanente. Consultar `AGENTS.md`, `docs/03_modelo_dominio.md` y `docs/adr/0001-arquitectura-inicial.md`.

## Variables de entorno (sin valores privados)

| Variable              | Uso                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Conexión PostgreSQL para API, migraciones y benchmark. Configurar explícitamente; el código tiene un fallback de desarrollo local. |
| `TEST_POSTGRES_URL`   | Habilita pruebas destructivas de PostgreSQL; solo base desechable migrada.                                                         |
| `IMPORT_AI_PROVIDER`  | `gemini` por defecto o `openai`; configurar solo valores soportados.                                                               |
| `GEMINI_API_KEY`      | Secreto del servidor para Gemini.                                                                                                  |
| `GEMINI_IMPORT_MODEL` | Opcional; fallback en código `gemini-3.5-flash-lite`.                                                                              |
| `OPENAI_API_KEY`      | Secreto del servidor para OpenAI.                                                                                                  |
| `OPENAI_IMPORT_MODEL` | Opcional; fallback en código `gpt-5.4-mini`.                                                                                       |
| `PORT`                | Puerto de API; fallback 3001.                                                                                                      |
| `NEXT_PUBLIC_API_URL` | URL pública para el cliente web; fallback `/api/v1`. No incluir secretos.                                                          |

La API (`main.ts`) y Prisma CLI cargan `dotenv/config`. Los comandos pnpm del paquete API leen su archivo local `apps/api/.env`; las variables ya exportadas conservan prioridad. No versionar archivos privados de entorno ni configurar `TEST_POSTGRES_URL` hacia la base real.

## Verificaciones del traspaso inicial

Entorno local: Node 24.7.0 y pnpm 11.19.0; dependencias existentes. Lint, tipado, tests y build ejecutados sin caché de Turbo.

- Formato, lint, typecheck y build de API/web: correctos.
- API: 58 pruebas correctas; 9 PostgreSQL omitidas.
- Web: 20 pruebas correctas tras corregir la espera de planificación.
- HTTP e2e: 2 correctas; 11 PostgreSQL omitidas. Primer intento limitado por permisos de puertos del entorno; repetición con acceso local correcta.
- Pruebas PostgreSQL, despliegue de migraciones y benchmark: no ejecutados por falta de una base desechable disponible. El benchmark y las pruebas truncan datos; no se usó la base del propietario.
- Un intento simultáneo de build/typecheck falló porque Next regeneraba `.next/types`; la secuencia equivalente a CI pasó. Ejecutar estos comandos secuencialmente.
- La prueba web `creates and permanently removes a planned meal` falló porque su fecha fija dejó de pertenecer a la semana actual. Se fijó el reloj de la prueba y se añadió `waitFor` sobre el recuento final, conservando las aserciones funcionales.
- Instalación local offline con lockfile congelado abortada por confirmación de reemplazo de dependencias sin terminal; no se sustituyeron las dependencias. La instalación limpia queda cubierta por CI del PR.

No quedan fallos observados en las verificaciones locales ejecutables tras la corrección. Las pruebas omitidas no equivalen a validación de persistencia ni a evidencia de la carga histórica. El resultado de CI del commit final se consulta en GitHub; esta sección no presupone una ejecución futura.

## Siguiente tarea recomendada para Hermes

Preparar, solo tras autorización, un proyecto PostgreSQL desechable separado y vacío para `test:postgres`; verificar su plan gratuito y mantener credenciales y endpoint distintos de Neon real. No usar una copia histórica para las pruebas destructivas. Integrar por PR la configuración y esta documentación tras las comprobaciones, sin publicar `.env`. Después, acordar el siguiente alcance del backlog; no implementar B-020/B-021 automáticamente.
