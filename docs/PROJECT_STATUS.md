# Estado del proyecto y traspaso a Hermes

Fecha de revisión: 9 de octubre de 2026. El traspaso inicial contrastó `origin/main` en `6ce24b3911dfd4cafb91ed756a60badff4beefd0`; antes de la transferencia a Neon se comprobó el checkout limpio y sincronizado en `18e723b5e4cd6595974be422c0a2a34a7661a288`. La configuración y la evidencia de transferencia se integraron mediante la PR #34 en `c12be78df5c3021b97e0a175e194111af57013da`, base limpia y sincronizada de la validación PostgreSQL independiente descrita abajo. La conexión histórica permanece fuera de Git: archivo local ignorado y, desde el 9 de octubre, secreto de producción del proyecto API en Vercel; nunca en la web ni en previews. Las credenciales de pruebas se usaron solo en memoria. Este documento registra hechos observados; no convierte conversaciones en evidencia de implementación.

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

## Validación PostgreSQL independiente — 8 de octubre de 2026

- Proyecto nuevo y separado: `cocina-tuda-tests-pg16`, ID `spring-wave-84908668`, rama `production`, ID `br-autumn-base-b2dss856`, base `cocina_tuda_test`, PostgreSQL 16.15, Frankfurt. La rama se llama `production` por defecto de Neon, pero pertenece exclusivamente al proyecto desechable de pruebas; no es la base histórica.
- Free comprobado en facturación y en el proyecto creado. Solo se seleccionó Postgres, sin activar servicios adicionales, planes de pago ni proveedores IA reales. No se clonó la biblioteca histórica. La conexión directa y TLS 1.3 con certificado verificado se comprobaron desde Node/pg.
- Antes de escribir se comprobó que el endpoint difería del histórico y que la base no tenía tablas públicas. Se aplicaron exclusivamente allí las seis migraciones del repositorio con `db:migrate`; sus checksums coinciden con las migraciones históricas y las 16 tablas de aplicación quedaron vacías.
- `DATABASE_URL` y `TEST_POSTGRES_URL` se fijaron explícitamente al destino de pruebas únicamente en los procesos hijos. La carga automática del archivo real se deshabilitó para esos comandos. `apps/api/.env` sigue ignorado y sin cambios; no se guardaron credenciales de pruebas en disco ni se configuró una variable destructiva permanente.
- Primer intento de `test:postgres`: 9 pruebas de repositorios correctas; HTTP e2e, 7 correctas y 4 fallidas. Dos recorridos agotaron el límite predeterminado de 5 segundos y los dos siguientes fallaron sobre los datos incompletos que aquellos debían preparar.
- Repetición con `pnpm --filter @cocina-tuda/api test:postgres --testTimeout=30000`: 9 pruebas de repositorios y 11 HTTP e2e correctas, ninguna omitida. El ajuste solo afecta al tramo HTTP e2e del script. Los dos recorridos que expiraban tardaron 5.026 y 5.770 segundos, respectivamente. No se modificó el código productivo ni ninguna aserción.
- Después se eliminaron únicamente los datos artificiales del proyecto de pruebas: las 16 tablas de aplicación volvieron a quedar vacías y las seis migraciones se conservaron. Las huellas de las filas completas de las 17 tablas históricas coincidieron antes y después de las dos ejecuciones; se mantienen 85 recetas, 675 líneas de ingredientes, 471 pasos y 85 confirmaciones. También se comprobó que el archivo de conexión histórico no cambió. No se accedió a backups ni se ejecutó el benchmark.
- Entorno: Node 26.7.0, pnpm 11.19.0 y Vitest 4.1.11. Se observó un aviso de deprecación de pg por consultas concurrentes en un mismo cliente, sin fallos en la repetición; su investigación queda fuera de esta tarea. La ejecución sin ampliar el timeout no está validada para esta conexión remota.
- Evidencia sin credenciales ni datos privados: [`postgres-test-verification.json`](postgres-test-verification.json). El proyecto de pruebas se conserva vacío y migrado para reutilizarlo; su conexión debe recuperarse de Neon y verificarse antes de cada nueva ejecución. Esa instantánea corresponde a la verificación manual previa a incorporar PostgreSQL al workflow; no se modifica para atribuirle futuras ejecuciones de CI.

## PostgreSQL desechable en CI

- El job protegido `validate` configura ahora un servicio `postgres:16`, base y rol `cocina_tuda_ci`, puerto publicado solo en `127.0.0.1` y health check con `pg_isready`. No utiliza conexiones de Neon, secretos del repositorio, datos históricos ni volúmenes persistentes del propietario.
- Después de las suites generales se aplican las seis migraciones al servicio y se ejecuta `test:postgres --testTimeout=30000` en un paso separado. `DATABASE_URL` y `TEST_POSTGRES_URL` no son variables globales del job: las limpiezas de los repositorios se ejecutan sin paralelismo entre archivos, y el recorrido HTTP después. Los comandos generales siguen omitiendo los casos PostgreSQL; el paso dedicado debe ejecutar los 9 de repositorios y los 11 HTTP e2e, sin omitirlos.
- La contraseña visible en el workflow es pública y exclusiva del servicio efímero de pruebas, no una credencial del propietario. La carga de archivos dotenv se deshabilita para los pasos de migración y persistencia. El servicio se elimina al finalizar el job; no se crea infraestructura cloud adicional ni se cambia el plan de ningún proveedor.
- Verificación real: PR #36, ejecución de GitHub Actions `37748426829` del 8 de octubre de 2026, commit `f0284e62d1ec5351a703f35fdacd720ce449beed`, finalizada con `success`. Se leyeron sus logs: seis migraciones aplicadas, 9 pruebas de repositorios y 11 HTTP e2e correctas, sin omisiones en el paso dedicado. Formato, lint, typecheck, suites generales y build también correctos; el paso `Stop containers` terminó con `success`. Esta evidencia corresponde a esa ejecución concreta; los cambios documentales posteriores requieren su propia comprobación de CI antes de integrar.

## Backup de Neon y recuperación aislada — 8 de octubre de 2026

- Tras autorización específica se instalaron los clientes `libpq@16` 16.15 con Homebrew y sus dependencias. No se arrancó PostgreSQL local ni Docker, ni se modificó el perfil del shell. No se activaron servicios de pago.
- Nueva copia privada: `/Users/Tuda/Documents/proyectos_hermes/backups/cocina_tuda_neon/20261008T083625Z/cocina_tuda.dump`, formato custom, 116.935 bytes, exportada con `pg_dump` desde un snapshot `REPEATABLE READ READ ONLY`. Archivo reabierto, SHA-256 comprobado y catálogo de `pg_restore --list` con datos de las 17 tablas. Se guardó también un checksum externo. Directorio `700`, archivos `600`; contenido no cifrado. Los backups históricos siguen intocables.
- Destino temporal autorizado y comprobado en Free: `cocina-tuda-recovery-pg16-20261008`, ID `wandering-truth-63298880`, rama `br-misty-resonance-b17wrna1`, base `cocina_tuda_restore`, PostgreSQL 16, Frankfurt. Se verificaron endpoint distinto del histórico, TLS con certificado validado y ausencia de tablas antes de escribir. No se usó la base de pruebas ni se clonó una rama histórica.
- La sesión de herramientas se reinició entre exportación y restauración. Al retomar se revalidó el archivo guardado y se capturó una nueva línea base de solo lectura de la fuente antes de restaurar; esa línea base y las pruebas detalladas se guardaron privadamente junto al dump. No se atribuyen a la exportación huellas que solo se persistieron después de reanudar.
- `pg_restore --single-transaction --exit-on-error --no-owner --no-acl` terminó correctamente sobre el destino vacío. Coinciden recuentos y SHA-256 de filas completas de las 17 tablas, incluidos identificadores y fechas; también columnas, restricciones, índices, funciones, versiones de extensiones y registros completos de las seis migraciones. Los checksums de migraciones coinciden con el repositorio. Se conservan 85 recetas, 675 líneas de ingredientes, 471 pasos y 85 confirmaciones.
- La fuente y su configuración local permanecieron sin cambios durante la restauración. Se eliminaron únicamente el proyecto temporal y sus recursos después de verificar la recuperación; su URL exacta devolvió `project not found`, y los proyectos histórico y de pruebas seguían presentes. La copia local se volvió a comprobar tras la limpieza. Las credenciales temporales solo se usaron en memoria.
- Evidencia pública sin archivos privados ni credenciales: [`backup-recovery-verification.json`](backup-recovery-verification.json). Esta prueba recupera la base de aplicación, no las cuentas, contraseñas, propietarios/grants originales ni ajustes del proveedor. Un SHA-256 protege la integridad respecto al checksum guardado; no autentica ni cifra la copia. No se programaron backups periódicos ni se configuró una segunda ubicación.

Pendientes del backlog: B-020 variantes/grupos de recetas y B-021 cuentas/propiedad multiusuario; después offline/sincronización, inventario, nutrición/escalado, recomendaciones, colaboración y favoritos/colecciones/estadísticas. No hay un nuevo sprint activo aprobado.

Limitaciones observadas: sin autenticación ni separación multiusuario; CORS habilitado; proxy web fijado a API local en 3001; sin conversión de unidades ni escalado de raciones; listas de compra independientes que no se recalculan al editar recetas, y sin borrado de listas completas. No se probó un proveedor IA real ni un recorrido manual en navegador en esta revisión. Los tests de proveedor usan respuestas simuladas. La validación PostgreSQL en CI no certifica un proveedor IA real ni un recorrido de navegador.

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

## Publicación privada Vercel — 9 de octubre de 2026

- La preparación se integró mediante PR #38 en `cfd1ab372abe975af19d6cccd68bf254024e9f55`. CI de main `37889947718` correcta, incluyendo PostgreSQL efímero; ambos despliegues reportaron éxito de construcción.
- Proyectos existentes Hobby: `cocina-tuda` y `cocina-tuda-api`. `DATABASE_URL` se guardó como Secret exclusivamente en producción API, y `API_INTERNAL_URL` como configuración de servidor exclusivamente en producción web. No se activaron servicios de pago ni se ejecutaron migraciones históricas.
- Comprobación anónima: GET a `/`, `/api/v1/health` y `/api/v1/recipes` en los dos dominios canónicos devolvió 302 hacia el login de Vercel, sin acceso a la aplicación. La sesión autorizada abrió la web, pero el proxy devolvió 502: la invocación API registró 500 `INTERNAL_FUNCTION_INVOCATION_FAILED`. Un build exitoso no acredita funcionamiento.
- Causa reproducida: el runtime Node de Vercel intercepta `http.Server.listen()` sin llamar al callback y espera a que termine la importación del módulo. El `await bootstrap()` a nivel de módulo esperaba a su vez el `app.listen()`, bloqueando esa importación. Se sustituye únicamente la llamada superior por `void bootstrap()`, manteniendo la espera interna de Nest. Referencias primarias: documentación de NestJS en Vercel y `packages/node/src/serverless-functions/serverless-handler.mts` del repositorio público de Vercel.
- Regresión rojo→verde en `main.spec.ts`: importación termina aunque el listener interceptado siga pendiente. Las tres pruebas de bootstrap y la suite API (61 pruebas, 9 PostgreSQL omitidas localmente), 2 HTTP e2e (11 PostgreSQL omitidas), formato, lint, tipado y build pasaron. Una simulación del interceptor sobre la API compilada real devolvió health 200, sin consultar PostgreSQL ni cargar el archivo histórico. La verificación posterior en Vercel y la lectura real de recetas siguen pendientes.

## Siguiente tarea recomendada para Hermes

Preparación autorizada de Vercel: proyectos independientes `cocina-tuda` (web) y `cocina-tuda-api` (API), plan Hobby observado en la cuenta existente. Se configuró `All Deployments` con login requerido en ambos antes de transferir credenciales de datos. La API permite al proyecto web exclusivamente producción a producción mediante Trusted Sources OIDC; previews no deben acceder a la biblioteca histórica. El proxy de servidor conserva cuerpos JSON y errores de validación, no reenvía cookies/credenciales del cliente ni redirects del upstream y mantiene respuestas sin caché. El desarrollo local conserva el proxy anterior. La decisión está en [ADR 0002](adr/0002-despliegue-privado-vercel.md). Publicación funcional, conexión de producción y comprobaciones reales de acceso siguen pendientes; no se acredita despliegue por haber creado proyectos o pasar pruebas locales.

La entrega documental de la recuperación quedó integrada mediante PR #37 en `b2080d6f7c5ab51ec4f51768a458490a5fc45abf`, con `validate` correcto en el PR (ejecución `37786729187`) y en `main` (`37787027318`), checkout limpio y sincronizado. La siguiente tarea autorizada es completar y verificar la publicación privada en Vercel sin exponer los datos históricos ni activar planes de pago. También quedan por acordar frecuencia, retención, cifrado y una segunda ubicación para los backups nuevos de Neon; no programar ni contratar servicios sin autorización ni implementar B-020/B-021 automáticamente.
