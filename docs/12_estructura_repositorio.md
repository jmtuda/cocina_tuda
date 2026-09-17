# Cocina Tuda — Estructura del repositorio

**Versión:** 2.2
**Estado:** Aprobado
**Responsable:** Arquitecto Técnico

## 1. Principio

La estructura crece con el producto. Solo se crean carpetas con una responsabilidad y contenido reales.

## 2. Estructura actual

```text
cocina_tuda/
├── apps/
│   ├── api/
│   └── web/
├── docs/
│   └── adr/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
└── README.md
```

No se crean paquetes compartidos ni aplicaciones futuras sin un uso concreto y más de un consumidor real.

## 3. API

```text
apps/api/src/
├── infrastructure/
│   └── prisma/
├── modules/
│   ├── library/
│   ├── catalog/
│   ├── search/
│   └── import/
├── app.module.ts
└── main.ts
```

`library`, `catalog`, `search` e `import` son módulos físicos independientes. Cada uno contiene solo las capas `domain`, `application`, `infrastructure` y `presentation` que necesita y expone sus dependencias públicas mediante su módulo de composición. `search` es una proyección transversal de lectura y no posee datos. `import` mantiene su propuesta transitoria separada del dominio definitivo y coordina la confirmación mediante los contratos públicos de catálogo y biblioteca.

Prisma se ubicará dentro de `apps/api/prisma` mientras sea infraestructura exclusiva de la API.

## 4. Web

```text
apps/web/
├── app/
└── features/
    ├── recipes/
    └── import/
```

Las funcionalidades viven en `features`. Los componentes compartidos no contienen acceso directo a datos ni reglas de negocio.

## 5. Paquetes futuros

Un paquete se crea cuando tiene una responsabilidad estable y más de un consumidor real.

- `config`: configuraciones comunes de TypeScript, lint o formato, solo si aparece duplicación real.
- `contracts`: contratos públicos compartidos entre API y clientes, sin entidades del dominio, solo cuando exista más de un consumidor.

Se evita usar `shared`, `common`, `utils` o `helpers` como contenedores genéricos.

## 6. Documentación y GitHub

`docs` contiene la fuente normativa y sus ADR. `.github` contiene únicamente automatización y plantillas realmente utilizadas.

## 7. Reglas de dependencia

- Una aplicación puede depender de un paquete; un paquete no depende de una aplicación.
- El frontend consume contratos y API, no código interno del backend.
- Ningún módulo importa infraestructura interna de otro.
- El código solo se extrae a un paquete cuando compartirlo reduce una duplicación real.

Los módulos de planificación o compra se materializarán únicamente cuando entren en alcance.
