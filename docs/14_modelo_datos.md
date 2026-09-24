# Cocina Tuda — Modelo de datos

**Versión:** 2.4
**Estado:** Aprobado
**Responsable:** Arquitecto Técnico

## 1. Objetivo

Describe la traducción persistente vigente de `03_modelo_dominio.md` y separa expresamente los conceptos aún no implementados.

## 2. Esquema actual

| Tabla                   | Datos principales                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `recipes`               | id, name, description?, author?, servings?, difficulty?, notes?, status, created_at, updated_at, archived_at?                      |
| `recipe_steps`          | id, recipe_id, position, text                                                                                                      |
| `ingredients`           | id, name, normalized_name, created_at, updated_at                                                                                  |
| `ingredient_variants`   | id, ingredient_id, name, normalized_name                                                                                           |
| `units`                 | id, name, abbreviation, normalized_name                                                                                            |
| `recipe_ingredients`    | id, recipe_id, ingredient_id, variant_id?, quantity?, unit_id?, optional, observations?, position                                  |
| `categories`            | id, name, normalized_name                                                                                                          |
| `recipe_categories`     | recipe_id, category_id                                                                                                             |
| `tags`                  | id, name, normalized_name                                                                                                          |
| `recipe_tags`           | recipe_id, tag_id                                                                                                                  |
| `planned_meals`         | id, recipe_id, planned_date, meal_name?, created_at, updated_at                                                                    |
| `shopping_lists`        | id, name, source_from?, source_to?, generated_at?, created_at, updated_at                                                          |
| `shopping_list_sources` | id, shopping_list_id, planned_meal_id, recipe_id, recipe_name, planned_date                                                        |
| `shopping_items`        | id, shopping_list_id, position, ingredient_id?, variant_id?, manual_name?, quantity?, unit_id?, observations?, optional, purchased |
| `shopping_item_sources` | shopping_item_id, list_source_id, recipe_ingredient_id                                                                             |
| `import_confirmations`  | import_id, recipe_id, confirmed_at                                                                                                 |

No existen tablas para fuentes o propuestas de importación, usuarios, grupos de recetas, sincronización ni documentos importados permanentes. `import_confirmations` conserva únicamente la clave técnica necesaria para que la confirmación sea idempotente.

## 3. Relaciones y restricciones

- `recipe_steps.position` es único por receta.
- Ingredientes, unidades, categorías y etiquetas tienen nombre normalizado único.
- Una variante tiene nombre normalizado único dentro de su ingrediente.
- Si `recipe_ingredients.variant_id` existe, la aplicación y la base de datos deben garantizar que pertenece al ingrediente indicado.
- Categorías y etiquetas se relacionan muchos-a-muchos con recetas.
- Las tablas intermedias evitan pares duplicados.
- Cantidades nunca se almacenan en ingredientes o unidades.
- Cada comida planificada referencia una receta sin copiar su contenido; fecha, receta y denominación no son únicas.
- `planned_meals.planned_date` es un día de calendario `DATE`, no un instante temporal.
- Cada elemento de compra pertenece a una lista y su posición es única en ella.
- Un elemento referencia un ingrediente de catálogo o contiene un nombre manual, nunca ambos; una variante catalogada debe pertenecer al ingrediente indicado.
- La procedencia de una lista conserva identificadores y datos descriptivos como instantánea, sin claves foráneas hacia planificación o recetas que puedan invalidarla al cambiar las fuentes.
- Cantidad conocida, unidad, variante y opcionalidad se conservan en cada línea consolidada; la cantidad desconocida permanece `NULL`.
- Cada `import_id` confirma como máximo una receta definitiva y cada receta confirmada corresponde a una única importación.

## 4. Identificadores y cantidades

Se utilizan UUID v4 generados por la base de datos.

Las cantidades son valores numéricos decimales opcionales del uso de ingrediente o elemento de compra y se persisten como `DECIMAL(12,3)`, nunca con coma flotante binaria. La ausencia de cantidad es válida y se representa con `NULL`.

## 5. Archivo y eliminación

Las recetas usan archivo lógico. Archivarlas no elimina sus planificaciones y estas muestran siempre el estado actual de la receta. Los catálogos referenciados no pueden eliminarse físicamente mientras estén en uso. Una comida planificada se elimina físicamente al retirarla; no usa archivo ni borrado lógico. Los elementos de compra se retiran físicamente; las listas no incorporan eliminación completa, archivo, papelera ni historial funcional.

## 6. Migraciones e índices

El esquema se modifica mediante migraciones reproducibles. Los índices adicionales se incorporan a partir de consultas reales y mediciones, además de claves y restricciones necesarias para integridad.

## 7. Conceptos no persistidos

La importación conserva sus propuestas y fuentes de forma transitoria. Solo persiste el vínculo técnico entre `import_id` y la receta definitiva para garantizar reintentos idempotentes; no almacena la fuente ni el borrador.
