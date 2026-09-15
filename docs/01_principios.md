# Cocina Tuda — Principios del proyecto

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Project Manager

Este documento guía las decisiones cuando existan varias alternativas válidas. Los procedimientos concretos pertenecen a otros documentos.

## 1. Producto

### 1.1 El usuario mantiene el control

Toda propuesta generada o modificada por el sistema debe poder revisarse, editarse y confirmarse antes de incorporarse definitivamente.

### 1.2 La IA es un asistente

La inteligencia artificial interpreta y propone; no es la fuente de verdad ni persiste decisiones definitivas por sí sola.

### 1.3 La aplicación se adapta al usuario

El sistema debe admitir hábitos culinarios y formas de organización diferentes sin imponer flujos innecesariamente rígidos.

### 1.4 La simplicidad tiene prioridad

Entre soluciones equivalentes se elegirá la más fácil de comprender, mantener y evolucionar. La complejidad requiere un beneficio concreto y actual.

### 1.5 La experiencia responde al uso real

La rapidez de consulta, la claridad y la facilidad de edición tienen prioridad sobre elementos sin valor funcional.

## 2. Dominio y datos

### 2.1 Cada dato tiene una fuente de verdad

La información se mantiene en un único lugar autorizado. Las relaciones tienen prioridad sobre copias que puedan divergir.

### 2.2 El conocimiento tiene prioridad sobre el documento

Los documentos importados son fuentes de procesamiento. El producto conserva el conocimiento estructurado; una política de retención futura podrá conservar originales solo si existe una necesidad explícita.

### 2.3 Cada entidad representa un concepto con identidad

Un atributo no se convierte en entidad sin una razón funcional. Tampoco se reduce a texto libre un concepto reutilizable que necesite identidad propia.

### 2.4 El conocimiento debe ser reutilizable

La biblioteca y sus catálogos forman el núcleo compartido por búsqueda, planificación, compras e importación.

## 3. Arquitectura

### 3.1 La biblioteca es el núcleo funcional

La receta es la entidad principal de la biblioteca; los demás módulos consumen sus capacidades mediante contratos definidos.

### 3.2 Modularidad con límites claros

Cada módulo posee sus reglas y datos. La modularidad debe reducir acoplamiento, no multiplicar capas o abstracciones sin necesidad.

### 3.3 El dominio es independiente de tecnologías e interfaces

Las reglas de negocio no dependen de la web, la base de datos, un framework o un proveedor externo.

### 3.4 Preparación no significa implementación anticipada

La evolución futura se facilita con límites y contratos estables, pero no se construyen mecanismos de multiusuario, sincronización u offline antes de necesitarlos.

## 4. Evolución y documentación

### 4.1 Cambios pequeños y verificables

El proyecto evoluciona mediante incrementos que puedan entenderse, probarse y revertirse razonablemente.

### 4.2 La documentación aprobada es normativa

Las conversaciones explican decisiones; la documentación aprobada es la referencia. Cada información se documenta una sola vez y se enlaza desde los demás documentos.

### 4.3 Las excepciones se hacen explícitas

Una excepción relevante debe justificar su contexto, decisión y consecuencias. Las decisiones arquitectónicas duraderas se registran mediante ADR.
