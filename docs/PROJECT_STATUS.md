# Estado del proyecto y traspaso a Hermes

Fecha de revisión: 7 de octubre de 2026. Base contrastada mediante fetch y API de GitHub: `origin/main` en `6ce24b3911dfd4cafb91ed756a60badff4beefd0`. Este documento registra hechos observados; no convierte conversaciones en evidencia de implementación.

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

**Carga histórica XLSX: no acreditada.** No hay importador XLSX ni informe de ejecución en el repositorio. La conexión local PostgreSQL devolvió `ECONNREFUSED`, no hay `.env` en este checkout y Docker no está ejecutándose. No se consultaron datos privados ni se migró la base real. No afirmar que el lote está cargado ni repetirlo a ciegas. El recuento de recetas por sí solo tampoco probaría la procedencia. Si sigue pendiente, es una carga única con reconciliación y respaldo, nunca una nueva feature de importación masiva.

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

Exportar la configuración para el proceso API; `main.ts` no carga dotenv. Prisma CLI sí importa `dotenv/config`. No versionar archivos privados de entorno.

## Verificaciones realizadas

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

Restablecer acceso a PostgreSQL local y verificar en modo lectura las migraciones y la trazabilidad de la carga histórica; preparar una base desechable separada para ejecutar `test:postgres` y el benchmark. Determinar con evidencia si el XLSX sigue pendiente antes de proponer su carga única. Después, acordar el siguiente alcance del backlog; no implementar B-020/B-021 automáticamente.
