# ADR 0002 — Despliegue privado en Vercel

Estado: aprobado por el propietario para preparar el despliegue privado, sujeto a verificación real antes de conectar los datos.

## Contexto

El propietario ha autorizado alojar web y API en Vercel Hobby, utilizar su sesión Google existente y conectar GitHub para despliegues automáticos. No ha autorizado servicios de pago, exposición pública de sus datos ni implementar cuentas multiusuario. La aplicación sigue sin autenticación propia.

## Decisión

Mantener dos proyectos independientes del mismo repositorio y equipo:

- `cocina-tuda`: raíz `apps/web`, Next.js.
- `cocina-tuda-api`: raíz `apps/api`, NestJS.

Ambos deben exigir Vercel Authentication con `All Deployments`, incluyendo producción y aliases, sin excepciones ni enlaces compartibles. La protección es un perímetro del proveedor, no autenticación ni aislamiento multiusuario del producto.

El navegador consume únicamente `/api/v1` en la web. En Vercel, un Route Handler de servidor llama a la API usando `API_INTERNAL_URL` y un token OIDC obtenido por petición con `@vercel/oidc`. La API confía exclusivamente en el proyecto web, de producción a producción, mediante Trusted Sources. No se utilizan secretos de bypass estáticos, cookies del navegador ni URLs firmadas en el cliente.

La conexión histórica de Neon se configura exclusivamente en el proyecto API y en producción, después de comprobar el rechazo anónimo. No se define `DATABASE_URL` en la web ni credenciales históricas en previews. El proxy rechaza entornos Vercel distintos de producción, configuración incompleta, rutas o parámetros reservados, mutaciones de otro origen y errores/redirects privados del upstream. No cachea respuestas ni reenvía credenciales o cookies del cliente. El desarrollo local conserva el rewrite al servidor en `127.0.0.1:3001`.

No usar la modalidad multi-service para esta entrega: comparte las variables del proyecto y ampliaría el alcance del secreto de base de datos al servicio web. No activar integraciones de almacenamiento, IA, analítica ni pruebas Pro para desplegar.

## Consecuencias y aceptación

- Comprobar la protección guardada en ambos proyectos y el rechazo de peticiones anónimas antes de añadir la conexión de Neon.
- Verificar por separado build, health de la API, assets de la web y listado/detalle autenticados. No considerar un build o HTTP 200 como prueba de persistencia o de todas las funciones.
- No ejecutar migraciones ni pruebas destructivas en producción. CI continúa usando PostgreSQL efímero.
- Vercel Functions limita el cuerpo de petición y respuesta a 4,5 MB; esto también limita las importaciones codificadas en JSON/base64, aunque el extractor local acepte 10 MiB. No se amplía almacenamiento ni se altera el dominio para evitar ese límite.
- La importación IA requiere configurar y autorizar por separado el proveedor y sus condiciones/coste; no se certifica usando respuestas simuladas.
- Si el perímetro deja de estar disponible en Hobby, detener el despliegue; nunca degradar a acceso público ni contratar otro plan automáticamente.

## Referencias oficiales consultadas

- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/deployment-protection/usage-and-pricing
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/services

Este ADR define el despliegue autorizado. No acredita que la publicación o el acceso a datos se hayan completado.
