# Cocina Tuda — Modelo de datos

**Versión:** 2.0  
**Estado:** Propuesto  
**Responsable:** Arquitecto Técnico

## 1. Objetivo

Define una traducción persistente inicial de `03_modelo_dominio.md`. Los nombres son conceptuales hasta crear y revisar el esquema Prisma.

## 2. Tablas iniciales

| Tabla | Datos principales |
|---|---|
| `recipes` | id, name, description?, author?, servings?, difficulty?, notes?, status, created_at, updated_at, archived_at? |
| `recipe_steps` | id, recipe_id, position, text |
| `ingredients` | id, name, normalized_name, created_at, updated_at |
| `ingredient_variants` | id, ingredient_id, name, normalized_name |
| `units` | id, name, abbreviation, normalized_name |
| `recipe_ingredients` | id, recipe_id, ingredient_id, variant_id?, quantity?, unit_id?, optional, observations?, position |
| `categories` | id, name, normalized_name |
| `recipe_categories` | recipe_id, category_id |
| `tags` | id, name, normalized_name |
| `recipe_tags` | recipe_id, tag_id |
| `planned_meals` | id, recipe_id, planned_date, meal_label?, notes?, created_at, updated_at |
| `shopping_lists` | id, name, source_start?, source_end?, created_at, updated_at |
| `shopping_list_items` | id, shopping_list_id, ingredient_id, quantity?, unit_id?, notes?, checked, source |

No se crean todavía tablas de usuarios, grupos de recetas, sincronización o documentos importados permanentes.

## 3. Relaciones y restricciones

- `recipe_steps.position` es único por receta.
- Ingredientes, unidades, categorías y etiquetas tienen nombre normalizado único.
- Una variante tiene nombre normalizado único dentro de su ingrediente.
- Si `recipe_ingredients.variant_id` existe, la aplicación y la base de datos deben garantizar que pertenece al ingrediente indicado.
- Categorías y etiquetas se relacionan muchos-a-muchos con recetas.
- Las tablas intermedias evitan pares duplicados.
- Cantidades nunca se almacenan en ingredientes o unidades.
- Una comida planificada referencia una receta; no copia su contenido.
- Un elemento de compra referencia un ingrediente y opcionalmente una unidad.

## 4. Identificadores y cantidades

Se utilizarán identificadores estables generados por la aplicación o la base de datos. El formato concreto se decidirá antes de la primera migración.

La representación decimal y precisión de cantidades permanece pendiente hasta definir casos como fracciones, cantidades aproximadas y consolidación. No debe cerrarse el esquema antes de esa decisión.

## 5. Archivo y eliminación

Las recetas usan archivo lógico. Los catálogos referenciados no pueden eliminarse físicamente mientras estén en uso. Para el resto de entidades se elegirá archivo o eliminación según la necesidad funcional; no se aplica borrado lógico indiscriminadamente.

## 6. Migraciones e índices

El esquema se modifica mediante migraciones reproducibles. Los índices adicionales se incorporan a partir de consultas reales y mediciones, además de claves y restricciones necesarias para integridad.

## 7. Pendientes antes de implementar

- identificadores;
- precisión de cantidades;
- política de normalización y colisiones;
- integridad ingrediente-variante;
- archivo de recetas ya planificadas;
- consolidación de unidades en compras.

