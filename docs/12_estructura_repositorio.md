# Cocina Tuda — Estructura del repositorio

**Versión:** 2.0  
**Estado:** Propuesto  
**Responsable:** Arquitecto Técnico

## 1. Principio

La estructura crece con el producto. Solo se crean carpetas con una responsabilidad y contenido reales.

## 2. Estructura inicial prevista

```text
cocina_tuda/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── config/
│   └── contracts/        # solo si api y web comparten contratos
├── docs/
│   └── adr/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .editorconfig
├── .gitignore
└── README.md
```

No se crearán inicialmente `scripts`, `.vscode`, `.husky`, `packages/shared`, `packages/ui` o aplicaciones futuras sin un uso concreto.

## 3. API

```text
apps/api/src/
├── modules/
│   ├── library/
│   ├── catalog/
│   ├── search/
│   ├── import/
│   ├── planning/
│   └── shopping/
└── main.ts
```

Cada módulo puede contener `domain`, `application`, `infrastructure` y `presentation` cuando las necesite. No existirá simultáneamente otro dominio duplicado en `packages/domain`.

Prisma se ubicará dentro de `apps/api/prisma` mientras sea infraestructura exclusiva de la API.

## 4. Web

```text
apps/web/
├── app/
├── features/
├── components/
├── lib/
└── public/
```

Las funcionalidades viven en `features`. Los componentes compartidos no contienen acceso directo a datos ni reglas de negocio.

## 5. Paquetes

Un paquete se crea cuando tiene una responsabilidad estable y más de un consumidor real.

- `config`: configuraciones comunes de TypeScript, lint o formato.
- `contracts`: contratos públicos compartidos entre API y clientes, sin entidades del dominio.

Se evita usar `shared`, `common`, `utils` o `helpers` como contenedores genéricos.

## 6. Documentación y GitHub

`docs` contiene la fuente normativa y sus ADR. `.github` contiene únicamente automatización y plantillas realmente utilizadas.

## 7. Reglas de dependencia

- Una aplicación puede depender de un paquete; un paquete no depende de una aplicación.
- El frontend consume contratos y API, no código interno del backend.
- Ningún módulo importa infraestructura interna de otro.
- El código solo se extrae a un paquete cuando compartirlo reduce una duplicación real.

La estructura detallada se validará con el primer corte vertical antes de considerarla definitiva.

