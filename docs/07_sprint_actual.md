# Cocina Tuda — Sprint actual

**Versión:** 6.4

**Estado:** Finalizado

**Responsable:** Project Manager

## Sprint 4 — Importación asistida

### Objetivo

Completar B-007 y B-008 para convertir una fuente admitida en una propuesta de receta nueva, estructurada, revisable y corregible, que solo pueda crear datos definitivos después de una confirmación explícita del usuario.

La IA interpreta y propone; nunca es fuente de verdad ni persiste por sí sola. Las fuentes originales son transitorias y no se incorporan a la biblioteca.

### Alcance finalizado

| Orden | Tarea    | Resultado verificable                                                                    | Estado     | Depende de                |
| ----- | -------- | ---------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| 1     | TASK-040 | Contratos de fuente, extracción, interpretación y propuesta independientes del proveedor | Finalizada | Sprint 3 y estabilización |
| 2     | TASK-041 | Texto pegado convertido en una propuesta estructurada y validada                         | Finalizada | 040                       |
| 3     | TASK-042 | Imágenes y los formatos documentales aprobados incorporados al mismo flujo               | Finalizada | 040–041                   |
| 4     | TASK-043 | Revisión, corrección, resolución de catálogos y confirmación humana antes de persistir   | Finalizada | 041–042                   |

TASK-040–TASK-043 son el alcance real de Fase 4 según el roadmap vigente. Completan B-007 y B-008; no incluyen planificación, compras ni recomendaciones mediante IA.

### Dependencias y orden de implementación

1. Aprobar las decisiones funcionales pendientes y fijar ejemplos de aceptación.
2. Materializar el módulo `import` y sus contratos, sin proveedor concreto en dominio o aplicación.
3. Implementar primero el corte completo con texto pegado y dobles deterministas.
4. Añadir extracción para imágenes y documentos aprobados reutilizando la misma propuesta.
5. Completar la experiencia de revisión y la confirmación contra los contratos públicos de `catalog` y `library`.
6. Validar que ninguna cancelación, corrección previa o respuesta inválida modifica datos definitivos.

## Flujo funcional

1. **Fuente de entrada.** El usuario aporta una fuente admitida y solicita expresamente procesarla.
2. **Extracción.** Un adaptador transforma la fuente transitoria en texto o bloques utilizables. No crea datos de biblioteca.
3. **Interpretación y propuesta.** Un proveedor sustituible devuelve una estructura candidata. La aplicación valida formato, límites y coherencia; una respuesta inválida no avanza.
4. **Resolución contra catálogos.** La propuesta compara candidatos con ingredientes, variantes, unidades, categorías y etiquetas existentes y marca coincidencias, novedades y ambigüedades.
5. **Revisión y corrección.** El usuario puede editar todos los campos, elegir relaciones existentes, aceptar propuestas de alta o descartar información. Cancelar no persiste nada.
6. **Confirmación.** Una acción inequívoca envía la versión revisada. El servidor vuelve a validarla y solo entonces coordina las operaciones públicas de catálogo y biblioteca.
7. **Persistencia definitiva.** Se aplican atómicamente las altas de catálogo expresamente confirmadas, sus relaciones y la creación de la receta. La fuente original y la propuesta temporal se descartan.

El backend no almacena fuentes ni borradores. La web puede mantener temporalmente la propuesta en almacenamiento local para tolerar una recarga accidental, pero debe eliminarla al confirmar o descartar. No es una receta definitiva ni un subsistema de persistencia; cualquier necesidad de sincronizar o reanudar borradores en servidor queda fuera de alcance.

## Modelo temporal de propuesta

`ProposedRecipe` pertenece al módulo de importación/aplicación y no modifica el modelo definitivo. Contendrá:

- campos escalares opcionales de receta y pasos ordenados;
- usos de ingrediente con texto de origen, ingrediente base propuesto, variante, cantidad decimal como texto, unidad, opcionalidad y observaciones;
- categorías y etiquetas propuestas;
- estado de resolución de cada referencia: coincidencia existente, nuevo elemento propuesto o sin resolver;
- incidencias de validación y ambigüedades asociadas al campo afectado.

Reglas de la propuesta:

- un campo ausente permanece ausente y no se inventa para satisfacer el esquema;
- una cantidad no interpretable conserva su texto de origen como incidencia, no como número aproximado;
- una variante solo puede resolverse bajo su ingrediente base;
- una unidad solo se vincula a una entidad existente cuando la identificación es inequívoca;
- categorías y etiquetas candidatas se mantienen separadas conforme a su función vigente;
- la información ambigua permanece visible y editable; no se resuelve silenciosamente;
- solo una propuesta ya revisada se transforma en los comandos definitivos de catálogo y receta.

## Interacción con catálogos

- **Vinculación automática:** se propone para coincidencias únicas por el mismo nombre normalizado y respetando la pertenencia ingrediente-variante. La vinculación se muestra al usuario y puede corregirse antes de confirmar.
- **Nuevo elemento propuesto:** nunca se crea durante extracción o interpretación. Debe mostrarse como alta pendiente y formar parte de la confirmación explícita.
- **Elección requerida:** nombres con varias interpretaciones, variantes sin base inequívoca, unidades dudosas y cualquier colisión se presentan para selección o corrección.
- **Validación final:** se reutilizan normalización, unicidad e integridad del catálogo; una colisión concurrente se devuelve a revisión y nunca provoca una fusión automática.

La confirmación debe evitar estados parciales: se validará la propuesta completa antes de escribir y altas, relaciones y receta se persistirán en una única transacción. El diseño técnico del límite transaccional deberá respetar los contratos públicos de `catalog` y `library`; `import` no accederá a sus repositorios ni tablas internas.

## Arquitectura propuesta

- **`import/domain`:** estructura temporal e invariantes propias de una propuesta; no contiene entidades definitivas ni SDK de IA.
- **`import/application`:** casos de uso para proponer, resolver y confirmar; puertos `SourceExtractor` y `RecipeInterpreter`; coordinación mediante contratos públicos de catálogo y biblioteca.
- **`import/infrastructure`:** extractores de los formatos aprobados y adaptador del proveedor de IA configurado externamente.
- **`import/presentation`:** API versionada para generar y confirmar propuestas, con DTO explícitos, límites de tamaño/tipo y errores seguros.
- **Web:** selección de fuente, progreso, formulario completo de revisión, incidencias por campo, resolución de catálogos, cancelación y confirmación inequívoca.

El proveedor recibe contenido de la fuente y una instrucción de salida estructurada. Debe devolver un contrato versionado que la aplicación valide estrictamente antes de usarlo. Respuestas incompletas pueden producir propuestas parciales; JSON inválido, contenido incompatible o incumplimiento del contrato producen un error recuperable y no persisten nada.

La configuración vigente utiliza Gemini mediante un adaptador de infraestructura y conserva OpenAI como adaptador alternativo. La selección se realiza en el servidor; dominio, aplicación y experiencia funcional dependen únicamente del contrato genérico de interpretación.

Se admite un reintento manual y, técnicamente, como máximo un reintento automático para fallos transitorios claramente identificados. No se incorporan agentes, colas, trabajos distribuidos, caché ni un motor documental.

### Persistencia y migraciones

No se prevén tablas ni migraciones para fuentes o borradores: tanto la fuente como la propuesta son transitorias. La persistencia definitiva reutiliza las capacidades de catálogo y biblioteca después de confirmar. La solución local para tolerar recargas no cambia el esquema.

## Fuentes

### Incluidas

- texto pegado;
- imágenes JPEG, PNG y WebP;
- PDF con texto extraíble y PDF visual o escaneado;
- Word `.docx`.

### Excluidas salvo aprobación expresa

- páginas web mediante URL, libros completos, correo, mensajería o conectores externos;
- `.doc` antiguo, HEIC, audio, vídeo, hojas de cálculo y formatos no aprobados;
- descarga automática o rastreo de fuentes remotas;
- almacenamiento permanente de originales.

Aunque la visión menciona fuentes posibles más amplias, el roadmap de Fase 4 solo autoriza texto, imágenes y documentos.

## Seguridad y privacidad

- Antes del primer envío de cada importación, la pantalla informará de que el contenido se enviará a un proveedor externo y exigirá una acción explícita. Ese consentimiento cubre los reintentos técnicos de la misma importación, no se guarda como preferencia global y una nueva importación vuelve a solicitarlo.
- Solo se envía el contenido necesario para interpretar la receta; no se adjuntan biblioteca, historial, secretos ni otros datos del usuario.
- Credenciales y proveedor se configuran fuera del repositorio y nunca se devuelven al cliente ni se registran.
- Fuentes, texto extraído y respuestas del proveedor no se incluyen en logs de aplicación salvo metadatos técnicos no sensibles.
- Se aplican límites de tipo y tamaño antes de procesar archivos y los errores públicos no revelan contenido ni detalles internos.
- La fuente original se descarta al terminar la petición; cancelar o fallar tampoco la conserva.

La política concreta del proveedor sobre retención y uso de datos deberá documentarse al seleccionar el adaptador. Si no puede cumplir estas condiciones, no será válido para esta fase.

## Estrategia de pruebas

- **Dominio:** propuestas parciales, cantidades decimales, campos ausentes, ambigüedades, variante incompatible y estados de resolución.
- **Aplicación:** extractores e intérpretes falsos y deterministas; respuesta completa, parcial, inválida, error transitorio, cancelación y reintento permitido.
- **Catálogos:** coincidencia normalizada única, nuevo elemento pendiente, colisión, variante bajo ingrediente incorrecto y unidad ambigua.
- **Confirmación:** ninguna escritura antes de confirmar; creación solo con ingredientes base resueltos; altas y receta atómicas; rechazo sin efectos parciales.
- **Integración:** fixtures sintéticos de cada formato aprobado y adaptadores simulados; sin llamadas reales obligatorias a IA.
- **API:** tipo/tamaño inválido, contrato de propuesta, errores seguros y protección frente al doble envío accidental; la confirmación nunca se reintenta automáticamente.
- **Web:** revisar y corregir campos, resolver relaciones, cancelar, confirmar y comprobar la receta definitiva.
- **Regresión:** mantener verdes catálogo, biblioteca, búsqueda, migraciones, PostgreSQL, lint, tipado, pruebas y builds.

Las llamadas reales al proveedor se limitan a una comprobación manual o integración opcional con credenciales externas; nunca condicionan la suite determinista ni CI.

## Criterios de aceptación

- Cada fuente aprobada produce una propuesta completa o parcial claramente marcada, nunca una receta definitiva.
- El usuario puede revisar y corregir todos los campos soportados antes de confirmar.
- Coincidencias, altas propuestas y ambigüedades del catálogo son visibles y corregibles.
- Cancelar, fallar o recibir una respuesta inválida deja biblioteca y catálogos sin cambios.
- La confirmación se bloquea mientras exista un ingrediente base sin resolver, vuelve a validar y persiste atómicamente una única receta nueva y solo las altas expresamente aceptadas.
- La receta confirmada cumple las mismas invariantes y contratos que una receta creada manualmente.
- Ningún original ni borrador queda almacenado permanentemente.
- Proveedor, modelo y SDK pueden sustituirse sin cambiar dominio ni casos de uso.
- Las pruebas críticas funcionan con dobles deterministas y las validaciones obligatorias permanecen verdes.

## Fuera de alcance

- planificación y compras;
- búsqueda nueva o cambios de relevancia;
- recomendaciones, generación creativa o agentes autónomos;
- importación masiva, procesos en segundo plano o reanudación de borradores;
- actualización, merge o detección avanzada de duplicados de recetas;
- almacenamiento o biblioteca de documentos originales;
- URLs y conectores externos no aprobados;
- fusión automática de catálogos o resolución difusa de duplicados;
- autenticación, multiusuario, sincronización u offline.

## Decisiones técnicas delegadas

Una vez aprobado el alcance, el equipo técnico podrá elegir:

- proveedor/modelo y SDK concreto según contrato, privacidad, coste y disponibilidad;
- librerías locales de extracción para los formatos aprobados;
- esquema exacto y versionado del DTO estructurado;
- límites razonables de tamaño, tiempo y número de páginas;
- política concreta del único reintento transitorio;
- diseño del límite transaccional y protección frente al doble envío, respetando los módulos públicos;
- distribución visual mínima del flujo de revisión.

## Decisiones funcionales aprobadas

1. Sprint 4 solo crea recetas nuevas; no actualiza, fusiona ni resuelve duplicados avanzados.
2. Se admiten texto, JPEG, PNG, WebP, PDF textual o escaneado y `.docx`.
3. Una propuesta puede estar incompleta durante la revisión, pero no se confirma con ingredientes base sin resolver ni infringiendo invariantes del catálogo.
4. Cada alta propuesta es visible, corregible y sustituible por una entidad existente; las aprobadas se confirman atómicamente con la receta.
5. Cada importación exige consentimiento explícito antes del primer envío al proveedor externo; sus reintentos técnicos no repiten el consentimiento y no existe preferencia global.
6. La web puede conservar un borrador local transitorio para tolerar recargas, sin almacenamiento documental ni persistencia de borradores en servidor.

## Riesgos relevantes

- OCR e interpretación pueden perder estructura o inventar valores; la propuesta parcial, la validación estricta y la revisión humana son controles obligatorios.
- Nombres culinarios ambiguos pueden enlazar con el catálogo incorrecto; solo la coincidencia normalizada única se propone automáticamente y siempre es corregible.
- Crear catálogo y receta requiere evitar confirmaciones duplicadas y estados parciales sin romper límites modulares.
- Imágenes y documentos pueden contener datos personales o contenido innecesario; deben limitarse los datos enviados y verificarse la política del proveedor.
- PDF escaneado y `.docx` aumentan dependencias y casos límite; se aislarán detrás de extractores y fixtures específicos.
- El almacenamiento local transitorio reduce pérdidas por recarga, pero no ofrece sincronización entre dispositivos ni recuperación tras borrar datos del navegador.
