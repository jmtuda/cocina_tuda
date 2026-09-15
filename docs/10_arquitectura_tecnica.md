# Cocina Tuda — Arquitectura técnica

**Versión:** 2.0  
**Estado:** Aprobado
**Responsable:** Arquitecto Técnico

## 1. Objetivo

Traduce la arquitectura funcional a una solución técnica mantenible. No modifica el alcance ni las reglas de negocio.

## 2. Estilo arquitectónico

El MVP se construirá como un monolito modular dentro de un monorepo. Tendrá una aplicación web, una API y paquetes compartidos solo cuando exista más de un consumidor real.

Se aplican límites inspirados en Clean Architecture:

- el dominio no importa frameworks, persistencia, HTTP ni interfaz;
- la aplicación coordina casos de uso y depende de contratos;
- infraestructura implementa persistencia e integraciones;
- presentación adapta HTTP o interfaz a los casos de uso.

No es obligatorio crear una capa, interfaz o mapper si todavía no separa una responsabilidad real.

## 3. Módulos iniciales

- `library`: recetas, pasos y sus clasificaciones.
- `catalog`: ingredientes, variantes y unidades.
- `search`: consultas de búsqueda.
- `import`: extracción y borradores de importación.
- `planning`: comidas planificadas.
- `shopping`: listas y elementos de compra.

Cada módulo expone operaciones públicas. Ninguno accede a tablas o clases internas de otro módulo.

## 4. Flujo de dependencias

```text
HTTP/UI -> application -> domain
              ^            ^
              |            |
        infrastructure ----+
```

La composición y la inyección de implementaciones se realizan en el borde de la aplicación. La infraestructura puede depender de contratos internos; el dominio nunca depende de infraestructura.

## 5. Aplicación y dominio

Los casos de uso representan acciones del producto. Las validaciones de formato se realizan en los adaptadores de entrada; las invariantes se protegen en el dominio.

Los DTO pertenecen a los límites HTTP o de aplicación y no sustituyen a las entidades. Las transacciones se coordinan mediante un contrato de unidad de trabajo definido junto al caso de uso que lo necesita.

## 6. Persistencia

PostgreSQL y Prisma pertenecen a infraestructura. Los modelos persistentes pueden diferir de los objetos del dominio; los adaptadores realizan su conversión.

Se crearán repositorios por agregado o necesidad de caso de uso, no automáticamente por tabla. Toda modificación del esquema se hará mediante migración versionada.

## 7. API

La API será REST, JSON y versionada bajo `/api/v1`. No expondrá modelos Prisma ni entidades internas directamente. OpenAPI se generará desde la implementación.

Se favorecerán cambios compatibles; una nueva versión solo se creará cuando exista una incompatibilidad real para consumidores publicados.

## 8. Integraciones e IA

Los proveedores externos se encapsulan mediante adaptadores. La importación produce un borrador; no invoca persistencia definitiva hasta recibir confirmación explícita del usuario.

## 9. Configuración, seguridad y errores

- Configuración externa, tipada y validada al arrancar.
- Secretos fuera del repositorio.
- Errores de dominio diferenciados de fallos técnicos.
- Respuestas sin trazas ni detalles sensibles.
- Logs estructurados sin claves, tokens ni contenido sensible innecesario.

El MVP de un solo usuario no implementará todavía autenticación ni autorización. La propiedad multiusuario se diseñará cuando entre en alcance.

## 10. Decisiones diferidas

No se implementarán anticipadamente:

- caché distribuida;
- mensajería;
- microservicios;
- autenticación multiusuario;
- sincronización u offline;
- observabilidad distribuida;
- versionado complejo de recetas.

Su adopción futura requiere necesidad demostrada y ADR.

## 11. Verificación arquitectónica

Las dependencias entre módulos y capas se verificarán mediante revisión y, cuando resulte útil, reglas automatizadas. La estrategia de pruebas se define en `17_estrategia_testing.md`.
