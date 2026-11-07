# Consulta móvil para Android

Estado: publicación autorizada por el propietario tras la demostración local; integración mediante PR/CI y despliegue Git de Vercel. El estado efectivo del despliegue debe contrastarse con su commit. Sin cambios en Neon ni en la API. La aplicación completa de mantenimiento sigue en `/`; la vista de consulta es independiente en `/consulta`.

## Alcance

- Consulta de recetas activas mediante búsqueda por texto/ingrediente y filtro por categoría, con paginación.
- Detalle con descripción, autor, raciones, dificultad, categorías/etiquetas, estado Revisada/Sin revisar, ingredientes y variantes, cantidades/unidades, opcionalidad, observaciones, pasos, Mambo y notas.
- Diseño de una columna en móvil, controles táctiles de al menos 48 px, texto legible y retorno al listado conservando búsqueda, categoría y página. El botón Atrás de Android/navegador también cierra el detalle. Los enlaces directos usan `?receta=UUID`.
- Sin crear, editar, marcar Revisada, importar, archivar ni eliminar. No modifica cantidades ni escala raciones. La edición queda fuera de esta fase.

La interfaz llama exclusivamente con GET a los contratos ya existentes de recetas y categorías, a través del proxy web `/api/v1`. No conecta el móvil con Neon ni incorpora credenciales. Es una superficie de consulta para el mismo usuario, no un rol nuevo de autorización: la aplicación completa y sus permisos actuales no se modifican.

## Instalación y uso en Android

En el dominio HTTPS protegido, cuando esté publicado el cambio:

1. Abrir `https://cocina-tuda.vercel.app/consulta` en Chrome e iniciar sesión si Vercel lo solicita.
2. En el menú ⋮, elegir «Instalar aplicación» o «Añadir a pantalla de inicio», según lo que ofrezca el navegador.
3. Abrir «Mis recetas» desde su icono. El manifiesto inicia en `/consulta`, con ámbito `/consulta` y presentación `standalone`.

Para usarla: escribe un nombre o ingrediente, elige opcionalmente una categoría y pulsa Buscar; toca una receta para ver ingredientes, preparación y Mambo. Usa «Volver a las recetas» o Atrás de Android para regresar sin perder los filtros. «Actualizar» vuelve a leer los datos. El estado de revisión es informativo, no editable. No hace falta instalar nada desde Google Play ni descargar un APK. Si solo aparece «Crear acceso directo», se puede usar como acceso a la misma vista, pero no se considera comprobada la apertura en ventana independiente.

Se incluyen iconos PNG reales de 192 y 512 px, también maskable, generados con `next/og`, sin servicios ni dependencias adicionales. El manifiesto solo se enlaza en la vista de consulta; no cambia la entrada normal de mantenimiento.

No se añade service worker porque esta fase no necesita offline, notificaciones ni sincronización. Chrome moderno puede ofrecer instalación con manifiesto válido y HTTPS sin un service worker; no se afirma compatibilidad idéntica en todos los navegadores. No es un APK ni una publicación en Google Play.

## Conexión y privacidad

Requiere Internet. Las peticiones de recetas usan `cache: no-store` y no se guardan en localStorage, IndexedDB o Cache Storage; permanecen en memoria mientras la página está abierta. Los recursos gráficos y la instalación pueden persistir en el navegador de forma normal, pero la aplicación no mantiene una biblioteca offline. Se informa cuando se detecta desconexión, se ofrecen reintentos de lectura y las respuestas HTML/login no se interpretan como recetas.

Se mantienen Vercel Authentication, el proxy y la restricción producción-a-producción actuales. No se habilitan excepciones, enlaces públicos, bypass ni secretos de cliente. El enlace al manifiesto utiliza explícitamente `crossorigin="use-credentials"` para que también en producción se envíe la sesión al solicitar el manifiesto protegido; no se duplica el enlace automático de metadata. Falta validar en un Android real que Vercel permita obtener el manifiesto/iconos e iniciar sesión desde la app instalada. Si el navegador no ofrece instalación o la sesión no se conserva, no se quitará la protección para resolverlo; habrá que evaluar el comportamiento antes de afirmar que la instalación está terminada.

## Comprobaciones ejecutadas

- 22 pruebas de consulta correctas: GET/no-store y destinos permitidos, errores/HTML de login, manifiesto con credenciales de sesión, búsqueda/categoría/página, historial y enlaces directos, cancelación de respuestas antiguas, reintentos, desconexión y lectura completa sin controles de escritura. Cantidad cero, cantidad ausente y Mambo se conservan.
- Lint de los archivos nuevos, typecheck web y build de producción correctos. El build incluye `/consulta`, su manifiesto y el generador de iconos.
- Servidor Next compilado real: página y manifiesto 200; iconos PNG 192/512 con firma y dimensiones verificadas.
- Navegador Chromium con datos exclusivamente sintéticos locales: lectura/listado/Atrás correctos; sin desbordamiento horizontal a 320, 390 y 768 px, botones de al menos 48 px. `Page.getAppManifest` sin errores y `Page.getInstallabilityErrors` vacío en ese entorno local. No equivale a instalar en un teléfono ni a validar el login de producción.
- Demostración local opcional en `http://127.0.0.1:3100/consulta`, API sintética GET en 3001. El lanzador está ignorado en `node_modules/.cache/verification/consultation-preview.mjs`; no usa `.env`, DB ni proveedores. Es solo una demostración, no un nuevo servicio de producción.

## Pendiente

La publicación está autorizada y se tramita mediante PR/CI. Sigue pendiente la comprobación de instalación y reapertura con un Android real bajo la protección existente. No requiere migraciones, cambios de secretos ni modificaciones de datos para publicarse.
