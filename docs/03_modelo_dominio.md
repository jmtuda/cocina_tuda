# Cocina Tuda — Modelo de dominio

**Versión:** 2.6
**Estado:** Aprobado
**Responsable:** Project Manager

## 1. Objetivo

Define los conceptos, relaciones e invariantes del MVP. La persistencia descrita en `14_modelo_datos.md` debe derivar de este documento.

## 2. Entidades y objetos principales

### Receta

Atributos: nombre, descripción opcional, autor opcional, raciones opcionales, dificultad opcional, notas opcionales, indicador de revisión humana, estado, fechas de creación y modificación.

La receta comienza sin revisar (`reviewed=false`), también si procede de una importación. El usuario puede marcar y desmarcar «Revisada» en el formulario de creación/edición. Confirmar una importación no equivale a declarar revisada la receta y la IA no asigna ese indicador. Editar otros datos, archivar o reactivar conserva el valor; no se desmarca automáticamente. Las recetas anteriores quedan sin revisar al aplicar la migración.

Relaciones: contiene pasos e ingredientes de receta; puede asociarse con categorías y etiquetas.

Reglas:

- se archiva en lugar de eliminarse durante el MVP;
- sus pasos tienen un orden único dentro de la receta;
- no almacena copias del catálogo.

### Paso

Pertenece a una receta y contiene orden y texto. El orden es único dentro de esa receta.

Puede contener una única configuración Mambo opcional, subordinada al paso y nunca numerada como otro paso: velocidad, temperatura en °C, CT, duración en segundos y observaciones del robot. Todos sus campos son opcionales; cero es un valor conocido y no equivale a ausencia. Los parámetros numéricos son enteros no negativos; no se presupone un límite de hardware ni se ejecuta el robot. Una configuración sin ningún dato se considera ausente.

La interfaz permite introducir tiempo en segundos o minutos, conservando segundos enteros en el contrato. La consulta muestra minutos enteros y el resto de segundos (90 segundos → 1 m 30 s), sin botón de conversión. La importación propone asociar líneas de parámetros al paso culinario anterior y exige revisión humana; el usuario puede corregir valores y asociación. No se convierten recetas históricas automáticamente.

### Ingrediente

Elemento único del catálogo identificado por nombre normalizado. Puede tener variantes.

### Variante de ingrediente

Especialización perteneciente a un ingrediente, como “cherry” para tomate. Su nombre es único dentro del ingrediente.

### Unidad

Unidad reutilizable con nombre y abreviatura. El usuario puede ampliar el catálogo. No se admiten unidades libres en un ingrediente de receta.

### Ingrediente de receta

Uso de un ingrediente dentro de una receta. Contiene cantidad opcional, unidad opcional, variante opcional, indicador de opcionalidad y observaciones.

Si existe una variante, debe pertenecer al ingrediente seleccionado.

### Categoría

Clasificación estructurada y plana. Una receta puede tener varias categorías y una categoría varias recetas.

### Etiqueta

Clasificación flexible y plana. Una receta puede tener varias etiquetas y una etiqueta varias recetas.

### Comida planificada

Referencia una receta para una fecha, indica un número entero positivo de comensales (2 por defecto) y puede incluir una denominación de comida. No conserva una copia de la receta y utiliza su versión actual.

Si la receta se archiva, las planificaciones existentes se conservan y permiten consultarla. Una receta archivada no está disponible normalmente para nuevas planificaciones y vuelve a estarlo al reactivarse.

### Lista de compra

Agrupa elementos de compra, tiene nombre y fechas y conserva la procedencia de la selección planificada con la que se generó. Es una instantánea independiente: los cambios posteriores de recetas o planificación no la recalculan y una regeneración crea otra lista.

Al generar una nueva lista, cada cantidad conocida se ajusta por comensales/raciones de la receta antes de consolidar. Si faltan las raciones o la cantidad, se conserva la cantidad original, incluida su ausencia. No se convierten unidades ni se altera la receta. El ajuste usa aritmética decimal exacta con redondeo al más próximo, mitad hacia arriba, a tres decimales por contribución; los cambios posteriores de comensales no alteran listas guardadas.

### Elemento de compra

Uso de un ingrediente dentro de una lista. Contiene cantidad opcional, unidad opcional, observaciones, opcionalidad y estado de compra. Puede crearse desde un ingrediente catalogado o como un elemento manual de nombre libre exclusivo de Compras.

## 3. Conceptos excluidos del MVP

`Usuario` y `Grupo de recetas` quedan fuera del modelo inicial. Su incorporación requiere diseño funcional previo y migración explícita.

## 4. Invariantes

- Los nombres normalizados de ingredientes, unidades, categorías y etiquetas son únicos en su catálogo.
- Una variante siempre pertenece al ingrediente que especializa.
- Cantidad, unidad y observaciones pertenecen al uso del ingrediente.
- Una receta puede contener varios usos del mismo ingrediente y variante; cada ingrediente de receta es un uso culinario independiente.
- Categorías y etiquetas son relaciones muchos-a-muchos y no jerárquicas.
- El importador nunca persiste una receta sin confirmación del usuario.
- Las fuentes originales de importación son transitorias y no se almacenan permanentemente. La retención técnica o local imprescindible durante la revisión no las convierte en datos definitivos de la biblioteca.
- La planificación referencia recetas existentes y no las modifica.
- Compras consume planificación, biblioteca y catálogo mediante contratos públicos y no escribe en ellos.
- Los elementos generados de compra pueden editarse o retirarse sin alterar recetas, catálogo ni planificación.
- Solo se consolidan contribuciones con el mismo ingrediente, variante, unidad, opcionalidad y presencia o ausencia de cantidad; unidades distintas y cantidades conocidas/desconocidas permanecen separadas.
- Las reglas de negocio son independientes de interfaz y persistencia.

## 5. Decisiones pendientes

Antes de implementar cada capacidad deberán concretarse, mediante criterios de aceptación:

- conversión entre unidades diferentes;
