# Documentación de Cocina Tuda

Esta carpeta es la fuente de verdad del proyecto. Las conversaciones ayudan a tomar decisiones, pero solo los documentos aprobados tienen carácter normativo.

## Orden de lectura

| Documento | Pregunta que responde |
|---|---|
| `00_vision.md` | ¿Por qué existe el producto y qué debe conseguir? |
| `01_principios.md` | ¿Cómo se decide entre alternativas válidas? |
| `02_arquitectura_funcional.md` | ¿Qué módulos funcionales existen y qué responsabilidad tienen? |
| `03_modelo_dominio.md` | ¿Qué conceptos, relaciones e invariantes gobiernan el negocio? |
| `04_backlog.md` | ¿Qué capacidades contempla el producto? |
| `05_roadmap.md` | ¿En qué orden se entregarán y qué trabajo implica cada fase? |
| `07_sprint_actual.md` | ¿Qué trabajo está activo ahora? |
| `10_arquitectura_tecnica.md` | ¿Cómo se organizará técnicamente el sistema? |
| `11_stack_tecnologico.md` | ¿Qué tecnologías están aprobadas? |
| `12_estructura_repositorio.md` | ¿Dónde residirá cada tipo de código? |
| `13_convenciones_codigo.md` | ¿Qué normas seguirá la implementación? |
| `14_modelo_datos.md` | ¿Cómo se persistirá el modelo de dominio? |
| `17_estrategia_testing.md` | ¿Cómo se verificará el sistema? |

Los antiguos documentos `06_backlog_tecnico.md` y `16_plan_desarrollo_tecnico.md` se han consolidado en `05_roadmap.md` para evitar tres fuentes de planificación.

## Jerarquía documental

En caso de conflicto se aplica este orden:

1. Visión y principios.
2. Arquitectura funcional y modelo de dominio.
3. Backlog y roadmap.
4. Arquitectura técnica y modelo de datos.
5. Estructura, convenciones y estrategia de pruebas.
6. Sprint actual.

Un conflicto no se resuelve interpretando silenciosamente un documento inferior: debe corregirse la documentación o registrarse la decisión correspondiente.

## Estados

- **Propuesto:** pendiente de revisión del propietario.
- **Aprobado:** válido y normativo.
- **Sustituido:** conservado únicamente como histórico.

Las decisiones arquitectónicas duraderas se registrarán en `adr/` cuando sean aprobadas.

