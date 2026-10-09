# Cocina Tuda

Cocina Tuda es una plataforma personal para convertir recetas procedentes de distintas fuentes en conocimiento culinario estructurado, consultable y reutilizable.

La documentación normativa se encuentra en [`docs/`](docs/README.md). El producto permite mantener e importar recetas, planificarlas y generar listas de compra editables.

Para continuar el desarrollo: [`AGENTS.md`](AGENTS.md) y [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) describen las reglas operativas y el estado verificado del traspaso a Hermes.

## Estado actual

- Producto: línea base aprobada.
- Documentación funcional: aprobada.
- Arquitectura técnica: aprobada como punto de partida.
- Base técnica: Sprint 0B finalizado.
- Sprint 1: finalizado.
- Sprint 2: finalizado.
- Sprint 3: finalizado.
- Sprint 4: finalizado.
- Sprint 5: finalizado.
- Sprint 6: finalizado.
- Funcionalidades: catálogos, clasificación, búsqueda, mantenimiento e importación de recetas, planificación semanal y listas de compra editables disponibles.

Los cambios de alcance o arquitectura deberán actualizar la documentación correspondiente antes de implementarse.

## Requisitos

- Node.js 24 LTS o posterior compatible.
- pnpm 11.19.0, gestionado mediante Corepack.
- PostgreSQL accesible mediante `DATABASE_URL`.
- Una clave del proveedor externo configurado para interpretar importaciones.

## Instalación

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @cocina-tuda/api prisma:generate
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cocina_tuda"
export IMPORT_AI_PROVIDER="gemini"
export GEMINI_API_KEY="..."
# Opcional; el valor predeterminado es gemini-3.5-flash-lite.
export GEMINI_IMPORT_MODEL="gemini-3.5-flash-lite"
pnpm --filter @cocina-tuda/api db:migrate
```

La API y Prisma CLI cargan `apps/api/.env` al ejecutarse desde ese paquete, como hacen los comandos pnpm anteriores. También pueden recibir variables exportadas; estas tienen prioridad sobre el archivo. Guarda las credenciales únicamente en el archivo local ignorado por Git, con permisos `600`, nunca en la documentación ni en el cliente web.

La instancia personal se ha copiado y verificado en Neon Free, PostgreSQL 16, región Frankfurt. `apps/api/.env` configura su conexión TLS. No vuelvas a importar el XLSX ni a ejecutar migraciones para repetir esa transferencia; consulta `docs/PROJECT_STATUS.md`. La base local se conserva como respaldo previo al cambio y no se sincroniza automáticamente con Neon.

El contenido de cada fuente importada se envía al proveedor externo solo después del consentimiento explícito del usuario. Cocina Tuda no conserva permanentemente la fuente original. En el nivel gratuito de Gemini, Google puede utilizar el contenido para mejorar sus productos; deben utilizarse únicamente fuentes que el usuario acepte compartir bajo esas condiciones.

El adaptador OpenAI continúa disponible como alternativa mediante `IMPORT_AI_PROVIDER=openai`, `OPENAI_API_KEY` y, opcionalmente, `OPENAI_IMPORT_MODEL`. La elección es configuración de servidor y no modifica el dominio ni el flujo de importación.

Durante la revisión, cada referencia muestra lo detectado por IA y su estado. Para crear un elemento de catálogo, selecciona «Crear nuevo…» o «Revisar creación», corrige el nombre (y la abreviatura de una unidad) y pulsa «Aprobar creación». Cambiar sus datos retira la aprobación; cambiar el ingrediente base también obliga a revisar su variante. Puedes elegir un elemento existente o descartar los datos opcionales. Una colisión de nombre normalizado requiere seleccionar explícitamente el existente, nunca se fusiona automáticamente. Los elementos aprobados solo se guardan junto con la receta al confirmar, en una única transacción idempotente; no es necesario abandonar Importar.

## Desarrollo

Ejecutar API y web simultáneamente:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Estado de la API: `http://localhost:3001/api/v1/health`
- OpenAPI: `http://localhost:3001/api/v1/docs`

## Validación

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Las seis migraciones acumuladas cubren biblioteca, catálogo y clasificación, búsqueda, planificación, compras e idempotencia de confirmación de importaciones.

Las comprobaciones específicas de búsqueda, planificación y compras sobre PostgreSQL se ejecutan contra una base de pruebas desechable ya migrada. Estas pruebas truncan tablas; nunca deben apuntar a la base del propietario. Sin `TEST_POSTGRES_URL` se omiten:

```bash
(
  # Solo una conexión cuyo endpoint se haya verificado como el proyecto de pruebas.
  export DATABASE_URL="postgresql://.../cocina_tuda_test?sslmode=verify-full"
  export TEST_POSTGRES_URL="$DATABASE_URL"
  pnpm --filter @cocina-tuda/api test:postgres --testTimeout=30000
)
```

El subshell limita estas variables al comando de pruebas y no cambia la conexión habitual de la aplicación. No guardes `TEST_POSTGRES_URL` en `apps/api/.env`. El proyecto independiente `cocina-tuda-tests-pg16` se verificó en Neon Free el 8 de octubre de 2026: PostgreSQL 16, seis migraciones y las 20 pruebas PostgreSQL correctas. Sus credenciales se usaron solo en memoria; no se guardaron localmente. La evidencia está en `docs/postgres-test-verification.json`.

El parámetro `--testTimeout=30000` se añade al tramo HTTP e2e del script; los repositorios mantienen su límite habitual. En Neon, dos recorridos HTTP superaron los 5 segundos predeterminados. La ejecución sin este ajuste falló; con el límite de 30 segundos pasaron las mismas aserciones, sin modificar código ni pruebas. El límite no es una garantía de rendimiento de la aplicación.

En GitHub Actions, `validate` crea su propio servicio `postgres:16`, aplica las seis migraciones y ejecuta `test:postgres` en un paso separado. Las variables de conexión se limitan a esos pasos y apuntan a `cocina_tuda_ci` en el loopback del runner; la contraseña pública de prueba solo pertenece a ese contenedor desechable. No usa secretos, conexiones de Neon ni datos personales. Los comandos generales siguen omitiendo los casos PostgreSQL, pero el paso dedicado los ejecuta secuencialmente y hace fallar `validate` si fallan. El servicio no monta almacenamiento persistente del propietario y se elimina al finalizar el job.

El benchmark es una operación independiente, no ejecutada durante esta verificación. Reemplaza los datos de la base indicada para generar su dataset reproducible; no debe apuntar a una base compartida:

```bash
DATABASE_URL="postgresql://.../cocina_tuda_test?sslmode=verify-full" pnpm --filter @cocina-tuda/api benchmark:search
```

## Backups y recuperación

El 8 de octubre de 2026 se guardó una nueva copia privada de Neon fuera del repositorio, bajo `/Users/Tuda/Documents/proyectos_hermes/backups/cocina_tuda_neon/20261008T083625Z/`. Se exportó con `pg_dump` 16.15 en formato custom desde un snapshot de solo lectura, se releyó y se comprobó su SHA-256. La carpeta tiene permisos `700` y los archivos `600`; el dump no está cifrado. Los backups históricos no se inspeccionaron ni modificaron.

La recuperación se probó con `pg_restore` 16.15 en una transacción sobre una base vacía de un proyecto temporal Neon Free PostgreSQL 16. Coincidieron las filas completas de las 17 tablas, las columnas, restricciones, índices, funciones, extensiones y las seis migraciones. La fuente se consultó solo en lectura y permaneció intacta durante la restauración. El proyecto temporal se eliminó después de verificar todo y se comprobó su ausencia. La evidencia pública está en `docs/backup-recovery-verification.json`; el archivo privado y las pruebas detalladas permanecen fuera de Git.

Esta copia recupera la base de aplicación, no las cuentas, contraseñas, propietarios/grants originales ni la configuración de Neon. La restauración usa `--no-owner --no-acl` y los objetos quedan bajo el rol del destino. Un checksum acredita integridad del archivo, no autenticidad ni cifrado. No se ha configurado una copia periódica automática: quedan por acordar frecuencia, retención, cifrado y una segunda ubicación. No restaurar nunca sobre la base real ni reutilizar sus backups como fixtures de pruebas.

## Preparación de Vercel privado

El despliegue autorizado usa dos proyectos Hobby del mismo equipo, con raíces `apps/web` y `apps/api`, conectados a GitHub y a `main`. Ambos requieren **Vercel Authentication → All Deployments** antes de conectar los datos. No es un sitio público ni incorpora cuentas propias: ver [ADR 0002](docs/adr/0002-despliegue-privado-vercel.md). La configuración no acredita por sí misma una publicación verificada.

En el proyecto web, definir `API_INTERNAL_URL` solo en producción, como origen HTTPS de la API sin path ni barra final. No definir `NEXT_PUBLIC_API_URL`: el navegador usa `/api/v1`. No añadir `DATABASE_URL`, claves IA ni secretos de bypass a la web. En el proyecto API, configurar la conexión histórica de Neon únicamente en producción, después de verificar el rechazo anónimo; no guardar `TEST_POSTGRES_URL` ni ejecutar migraciones al desplegar. Instalación con `pnpm install --frozen-lockfile`; la web usa su script `build` y NestJS su preset nativo. Verificar Node 24 o posterior compatible y las protecciones reales del proveedor.

En la API, Trusted Sources debe admitir únicamente `cocina-tuda` de **production → production**. La web obtiene OIDC en el servidor para cada petición; no transmite tokens al navegador. Previews rechazan el proxy y no reciben la conexión histórica. Fuera de Vercel se conserva el rewrite local a `127.0.0.1:3001`. Si falta configuración o identidad del servidor, el proxy falla cerrado.

Las funciones de Vercel limitan petición y respuesta a 4,5 MB, incluyendo JSON/base64; las importaciones grandes pueden ser rechazadas antes de llegar al extractor de 10 MiB. La importación IA real y los recorridos de escritura requieren su propia verificación, no están acreditados por el build ni por una lectura de recetas. No desactivar protección, habilitar enlaces compartibles ni cambiar de plan para resolver un fallo.
