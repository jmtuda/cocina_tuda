# Cocina Tuda — Estrategia de pruebas

**Versión:** 2.0  
**Estado:** Propuesto  
**Responsable:** QA / Arquitecto Técnico

## 1. Objetivo

Proporcionar confianza proporcional al riesgo y permitir cambios seguros. Se valida comportamiento observable, no detalles accidentales de implementación.

## 2. Niveles

### Unitarias

Protegen invariantes, objetos de valor y reglas del dominio sin framework, red o base de datos.

### Aplicación

Verifican coordinación de casos de uso, permisos cuando existan, transacciones y respuestas mediante dobles sencillos.

### Integración

Comprueban adaptadores de persistencia, migraciones, restricciones y contratos con servicios externos simulados.

### API y navegador

Las pruebas de API cubren contratos HTTP. Playwright se reserva para recorridos críticos del usuario; no duplica exhaustivamente pruebas inferiores.

## 3. Estrategia por cambio

Cada cambio añade las pruebas necesarias para su riesgo:

- camino principal;
- límites relevantes;
- errores esperados;
- regresión específica cuando corrige un defecto.

Los cambios exclusivamente documentales se validan con revisión y comprobaciones de formato o enlaces cuando estén disponibles.

## 4. Datos y aislamiento

Se utilizan datos ficticios y deterministas. Las pruebas de integración ejecutan un entorno aislado y reproducible. Ninguna prueba depende de servicios reales de IA ni de datos personales.

## 5. Integración continua

Las pull requests ejecutarán progresivamente formato, lint, typecheck, pruebas y build. Una comprobación solo se hace obligatoria cuando es estable y accionable.

## 6. Cobertura

No se fijan inicialmente porcentajes universales. Se medirá cobertura para detectar áreas sin verificar, priorizando invariantes y casos de uso críticos. Podrán establecerse umbrales cuando exista una base representativa.

## 7. Criterio de salida

Una entrega está preparada cuando pasan las comprobaciones pertinentes, no quedan defectos críticos conocidos, los riesgos residuales están documentados y los criterios de aceptación tienen evidencia verificable.

