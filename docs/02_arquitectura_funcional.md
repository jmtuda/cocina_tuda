# Cocina Tuda — Arquitectura funcional

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Project Manager

## 1. Objetivo

Describe los módulos desde el punto de vista del producto, sus responsabilidades y sus relaciones. No prescribe tecnologías ni carpetas.

## 2. Núcleo funcional

### Biblioteca

Gestiona recetas, pasos, notas y sus relaciones con ingredientes y clasificaciones. La receta es su entidad principal.

### Catálogo culinario

Gestiona elementos reutilizables:

- ingredientes;
- variantes de ingrediente;
- unidades;
- categorías;
- etiquetas.

Las cantidades y observaciones pertenecen al uso de un ingrediente, no al catálogo.

## 3. Módulos del MVP

### Búsqueda

Consulta la biblioteca y el catálogo. No posee ni modifica datos funcionales.

### Importación

Interpreta texto, imágenes o documentos y genera un borrador editable. Solo la confirmación del usuario invoca la creación o actualización de una receta.

### Planificación

Asocia recetas con una fecha y una denominación opcional de comida. Admite cualquier número de comidas por día y días vacíos. No copia ni modifica recetas.

### Compras

Gestiona listas y elementos de compra. Puede generarlos a partir de una selección de comidas planificadas y permite cambios manuales posteriores.

## 4. Interfaz y servicios externos

La aplicación web presenta información y recoge acciones; no posee reglas de negocio. La IA y otros proveedores son servicios sustituibles y nunca son propietarios de datos.

## 5. Dependencias funcionales

- Biblioteca utiliza el catálogo.
- Búsqueda consulta biblioteca y catálogo.
- Importación propone datos y utiliza las operaciones públicas de biblioteca y catálogo tras la confirmación.
- Planificación referencia recetas de la biblioteca.
- Compras puede utilizar planificación y catálogo.

Ningún módulo accede a la implementación interna o a la persistencia de otro.

## 6. Fuera del MVP

Usuarios múltiples, colaboración, sincronización, offline, inventario, nutrición y aplicaciones móviles se diseñarán cuando entren en alcance. El MVP podrá usar un propietario implícito sin crear todavía un módulo de usuarios.
