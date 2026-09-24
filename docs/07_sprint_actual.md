# Cocina Tuda — Sprint actual

**Versión:** 8.3

**Estado:** Finalizado

**Responsable:** Project Manager

## Sprint 6 — Listas de compra

### Objetivo

Completar B-010 para generar una lista de compra editable a partir de comidas planificadas, conservar correctamente ingredientes, variantes, cantidades y unidades, y permitir su mantenimiento y marcado manual.

`shopping` será propietario de listas y elementos de compra. Consumirá información pública de planificación, biblioteca y catálogo en el momento de generar, sin escribir en esos módulos ni convertirse en almacenamiento interno de `planning`.

### Alcance finalizado

| Orden | Tarea    | Resultado verificable                                                         | Estado     | Depende de |
| ----- | -------- | ----------------------------------------------------------------------------- | ---------- | ---------- |
| 1     | TASK-060 | Reglas de consolidación, cantidades, unidades y casos ambiguos aprobadas      | Finalizada | Sprint 5   |
| 2     | TASK-061 | Listas y elementos de compra implementados y persistentes                     | Finalizada | 060        |
| 3     | TASK-062 | Generación desde planificación mediante contratos públicos                    | Finalizada | 060–061    |
| 4     | TASK-063 | Edición, altas, retiradas y marcado manual de elementos disponibles en la web | Finalizada | 061–062    |

TASK-060–TASK-063 son el alcance real de Fase 6 según el roadmap vigente y completan B-010. Con esta fase concluye el alcance funcional previsto para el MVP; no se incluyen capacidades posteriores.

### Dependencias y orden

1. Aprobar las decisiones funcionales de TASK-060 y convertirlas en una matriz de ejemplos verificables.
2. Materializar `shopping` con sus propias entidades, casos de uso, repositorios y API.
3. Exponer solo las lecturas públicas mínimas que Compras necesite de `planning`, `library` y `catalog`.
4. Implementar la generación desde el intervalo o selección aprobados y persistir su resultado en Compras.
5. Incorporar la experiencia de consulta, edición, alta, retirada y marcado manual.
6. Validar migraciones y recorridos completos sobre PostgreSQL real, además de la regresión del producto.

## Flujo funcional

1. El usuario elige un intervalo, revisa sus comidas planificadas y puede excluir cualquiera antes de generar.
2. Compras consulta comidas planificadas mediante el contrato público de `planning` y obtiene los usos de ingredientes actuales mediante el contrato público de `library`.
3. Cada aparición de una receta planificada aporta una vez todos sus usos de ingrediente; recetas y usos repetidos producen contribuciones repetidas.
4. La aplicación conserva ingrediente base, variante, cantidad decimal exacta, unidad, opcionalidad y observaciones antes de aplicar las reglas de TASK-060.
5. Se muestra el resultado generado y se crea una lista con elementos propios de Compras.
6. El usuario puede modificar sus elementos, añadir otros, retirarlos y marcar o desmarcar su compra sin alterar recetas ni planificación.
7. La lista queda como instantánea independiente: los cambios posteriores de recetas o planificación no la recalculan y regenerar crea otra lista.

## Modelo de dominio

### Lista de compra

- identificador y nombre;
- fechas de creación y modificación;
- procedencia planificada: intervalo, fecha de generación y referencias suficientes a las comidas y recetas seleccionadas;
- colección ordenada de elementos de compra.

La lista pertenece exclusivamente a Compras. Su relación con la planificación aporta procedencia, no propiedad compartida.

### Elemento de compra

- identidad propia y posición dentro de la lista;
- ingrediente base y variante opcional para líneas generadas o catalogadas, o nombre libre para elementos manuales exclusivos de Compras;
- cantidad decimal opcional y unidad opcional;
- observaciones opcionales;
- procedencia de las contribuciones generadas;
- estado comprado/no comprado;
- indicador de opcionalidad.

Un elemento generado es editable y no modifica el ingrediente de receta que lo originó. La eliminación de un elemento afecta únicamente a la lista.

### Contribución de generación

La aplicación puede utilizar una estructura transitoria sin identidad persistente para aplicar la consolidación. Representará un uso concreto de ingrediente aportado por una aparición concreta de una receta planificada. No será una entidad de `planning` ni una copia persistente de la receta.

## Relaciones y dirección de dependencias

- `shopping` consulta `planning` para obtener las comidas del origen aprobado.
- `shopping` consulta `library` para leer los usos actuales de ingrediente de cada receta referenciada.
- `shopping` consulta `catalog` para validar y representar ingredientes, variantes y unidades.
- `planning`, `library` y `catalog` no dependen de Compras.
- `shopping` no accede a repositorios, tablas ni modelos Prisma de otros módulos.
- búsqueda e importación no participan en esta fase.

La futura incorporación de inventario podría aportar otra fuente a Compras, pero Sprint 6 no creará el módulo, los contratos ni una infraestructura genérica de fuentes hasta que exista esa necesidad.

## Cambios por capa

- **Dominio:** `ShoppingList`, `ShoppingItem` y reglas aprobadas de identidad, edición, marcado y consolidación.
- **Aplicación:** crear y consultar listas; generar desde planificación; editar nombre y elementos; añadir, retirar y marcar; coordinar lectores públicos sin transacciones distribuidas entre módulos.
- **Persistencia:** repositorios propios de Compras y migración aditiva para listas y elementos, con cantidades decimales exactas y restricciones coherentes con las decisiones aprobadas.
- **API:** endpoints versionados para listar, crear/generar, consultar y editar listas y elementos, con errores y DTO coherentes con la API vigente.
- **Interfaz:** selección del origen planificado, resultado de generación, detalle de lista, edición de líneas, alta manual, retirada y marcado de comprado.

### Migraciones

La migración de Compras incorpora:

- `shopping_lists`: identificador, nombre, intervalo y fecha de generación nullable y marcas de tiempo;
- `shopping_items`: identificador, lista, posición, referencia opcional de ingrediente y variante, nombre libre alternativo, cantidad decimal nullable, unidad nullable, observaciones, opcionalidad y estado de compra;
- procedencia de generación suficiente para relacionar cada resultado con las comidas y recetas que contribuyeron, sin copiar modelos internos de otros módulos;
- claves foráneas e índices para listar elementos ordenados y consultar listas recientes.

No se crearán tablas de conversión, inventario, historial o sincronización. Las referencias de procedencia no provocan actualización automática ni propiedad compartida.

## Alcance incluido

- persistir varias listas de compra y consultar su detalle;
- generar desde la planificación conforme a la selección aprobada;
- contar por separado cada aparición de una receta o uso de ingrediente antes de consolidar;
- preservar cantidades exactas, ausencia de cantidad, unidad, variante, opcionalidad y observaciones;
- editar posteriormente los campos aprobados de cada elemento;
- añadir y eliminar elementos manualmente;
- marcar y desmarcar elementos como comprados;
- mantener Compras independiente de las fuentes que aportan información.

## Fuera de alcance

- inventario doméstico, descuentos automáticos por existencias o B-030;
- conversión nutricional, escalado por raciones o B-031;
- recomendaciones, predicción de consumo o IA;
- supermercados, precios, pasillos, presupuestos, pedidos o proveedores externos;
- colaboración, multiusuario, sincronización u offline;
- historial funcional o auditoría de cambios;
- unidades libres o tablas de conversión si no se aprueban expresamente;
- actualización automática de recetas o planificación desde una lista;
- fases o capacidades posteriores al MVP.

## Estrategia de pruebas

- **Dominio:** matriz aprobada de consolidación para repeticiones, variantes, unidades iguales o distintas, cantidades ausentes, opcionalidad y observaciones.
- **Aplicación:** generación por intervalo con exclusiones, una o varias comidas, receta repetida, ingrediente repetido dentro de una receta, días vacíos, receta archivada ya planificada y errores de referencias públicas.
- **Exactitud:** suma decimal sin coma flotante binaria y preservación de cantidades que no puedan consolidarse.
- **Independencia:** editar, retirar o marcar elementos no modifica planificación, recetas ni catálogo; cambios posteriores en fuentes no alteran la instantánea y regenerar crea otra lista.
- **Persistencia/PostgreSQL:** migraciones desde base vacía, claves foráneas, procedencia, orden, nullable, decimales, borrado de elementos y recorrido generación–persistencia–lectura.
- **API:** contratos, UUID, intervalos, listas inexistentes, conflictos y validaciones de altas y ediciones manuales.
- **Interfaz:** generar, revisar, editar, añadir, retirar y marcar; estados vacío, carga y error.
- **Regresión:** mantener verdes biblioteca, catálogo, búsqueda, importación, planificación, migraciones acumuladas, lint, tipado, pruebas y builds.

## Criterios de aceptación

- Una selección planificada válida produce una lista persistente con todas sus contribuciones tratadas según TASK-060.
- Repetir recetas o ingredientes produce resultados deterministas y no pierde cantidades, variantes, opcionalidad ni observaciones.
- Cantidades decimales permanecen exactas y la ausencia de cantidad sigue siendo explícita.
- Las unidades distintas nunca se suman o convierten fuera de la regla aprobada.
- El usuario puede consultar la lista y editar, añadir, retirar y marcar elementos.
- Ninguna operación de Compras modifica recetas, planificación o catálogo.
- La procedencia y los cambios posteriores de las fuentes se comportan según la política aprobada.
- La migración completa funciona sobre PostgreSQL vacío y el recorrido HTTP–aplicación–persistencia–lectura queda cubierto.
- La API, la interfaz y la documentación representan las mismas reglas y todas las validaciones obligatorias permanecen verdes.

## Decisiones técnicas delegadas

Una vez aprobado el comportamiento, el equipo técnico podrá decidir:

- límites razonables del intervalo y tamaño de una generación;
- DTO, rutas y paginación exactos conforme a las convenciones existentes;
- representación interna para sumar decimales sin pérdida;
- índices, orden determinista y estrategia de posiciones;
- límites de texto y mensajes de validación;
- composición visual mínima de generación, detalle y marcado;
- forma de los lectores públicos mínimos, sin crear una abstracción genérica para inventario futuro.

## Decisiones funcionales aprobadas

1. **Selección.** Se elige un intervalo inclusivo y pueden excluirse comidas concretas antes de generar. Cada `PlannedMeal` seleccionado contribuye una vez.
2. **Consolidación segura.** Solo se consolidan contribuciones con igual ingrediente base, variante —incluida su ausencia—, unidad, opcionalidad y estado cuantificado/no cuantificado.
3. **Unidades.** Unidades diferentes permanecen separadas. Sprint 6 no incorpora conversiones ni equivalencias.
4. **Cantidades ausentes.** No equivalen a cero ni se mezclan con cantidades conocidas. Varias contribuciones compatibles sin cantidad pueden producir una línea sin cantidad.
5. **Opcionalidad.** Los ingredientes opcionales se incluyen, permanecen identificables y no se consolidan con apariciones obligatorias.
6. **Observaciones.** Se conservan sin interpretación, resumen ni IA; solo se elimina una duplicación textual exacta trivial.
7. **Raciones.** Cada comida aporta una vez las cantidades actuales de su receta. No existe escalado por raciones o comensales.
8. **Instantánea y procedencia.** La lista generada es independiente y conserva referencias suficientes a comidas y recetas de origen. Los cambios posteriores en las fuentes no la modifican.
9. **Regeneración.** Siempre crea una lista nueva y nunca sobrescribe una existente ni sus ediciones manuales.
10. **Elementos manuales.** Se admiten nombres libres sin relación obligatoria con el catálogo y sin crear ingredientes automáticamente.
11. **Eliminación.** Pueden retirarse elementos, pero no eliminarse listas completas ni se añaden estados, papelera, archivo o historial.
12. **Edición independiente.** Editar Compras no modifica biblioteca, catálogo ni planificación.

## Riesgos y contradicciones

- Sumar unidades incompatibles produciría una lista incorrecta; por ello permanecen separadas y la conversión continúa como evolución pendiente.
- La ausencia de cantidad y la opcionalidad expresan incertidumbre culinaria y no deben perderse durante la consolidación.
- Recetas repetidas y usos repetidos multiplican contribuciones legítimas; deduplicar antes de aplicar reglas perdería información.
- Una lista editable no se sincroniza con fuentes cambiantes para no sobrescribir decisiones del usuario.
- El alta manual libre puede ampliar la utilidad de Compras, pero requiere una representación que no contamine el catálogo culinario.
- Exponer datos internos de receta o planificación rompería límites modulares; se necesitarán proyecciones públicas mínimas.
- No se detectan contradicciones restantes entre roadmap, backlog, dominio y producto: Fase 6 corresponde a TASK-060–TASK-063 y B-010.
