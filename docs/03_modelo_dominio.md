# Cocina Tuda — Modelo de dominio

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Project Manager

## 1. Objetivo

Define los conceptos, relaciones e invariantes del MVP. La persistencia descrita en `14_modelo_datos.md` debe derivar de este documento.

## 2. Entidades y objetos principales

### Receta

Atributos: nombre, descripción opcional, autor opcional, raciones opcionales, dificultad opcional, notas opcionales, estado, fechas de creación y modificación.

Relaciones: contiene pasos e ingredientes de receta; puede asociarse con categorías y etiquetas.

Reglas:

- se archiva en lugar de eliminarse durante el MVP;
- sus pasos tienen un orden único dentro de la receta;
- no almacena copias del catálogo.

### Paso

Pertenece a una receta y contiene orden y texto. El orden es único dentro de esa receta.

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

Referencia una receta para una fecha y puede incluir una denominación de comida. No conserva una copia de la receta y utiliza su versión actual.

### Lista de compra

Agrupa elementos de compra, tiene nombre y fechas y puede indicar de qué intervalo o selección de planificación se generó.

### Elemento de compra

Uso de un ingrediente dentro de una lista. Contiene cantidad opcional, unidad opcional, observaciones y estado de compra. Puede crearse manualmente o generarse desde la planificación.

## 3. Conceptos excluidos del MVP

`Usuario` y `Grupo de recetas` quedan fuera del modelo inicial. Su incorporación requiere diseño funcional previo y migración explícita.

## 4. Invariantes

- Los nombres normalizados de ingredientes, unidades, categorías y etiquetas son únicos en su catálogo.
- Una variante siempre pertenece al ingrediente que especializa.
- Cantidad, unidad y observaciones pertenecen al uso del ingrediente.
- Una receta no contiene ingredientes o clasificaciones duplicados sin una justificación funcional.
- Categorías y etiquetas son relaciones muchos-a-muchos y no jerárquicas.
- El importador nunca persiste una receta sin confirmación del usuario.
- La planificación referencia recetas existentes y no las modifica.
- Los elementos generados de compra pueden editarse sin alterar recetas ni planificación.
- Las reglas de negocio son independientes de interfaz y persistencia.

## 5. Decisiones pendientes

Antes de implementar cada capacidad deberán concretarse, mediante criterios de aceptación:

- precisión y representación de cantidades;
- consolidación y conversión entre unidades;
- comportamiento al archivar una receta planificada;
- tratamiento de duplicados del catálogo;
- retención de fuentes importadas durante el proceso de revisión.
