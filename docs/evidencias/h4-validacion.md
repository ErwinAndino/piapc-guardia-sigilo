---
id: laboratorio-evidencia-validacion-h4
titulo: Evidencia de validación H4
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia de validación H4

- Fecha: 14 de septiembre de 2026.
- Entorno: Windows, Node.js 22.6.0, npm 10.8.2.
- Versión evaluada: cambios H4 sobre `e14a1c6`.

| Criterio | Método | Resultado |
|---|---|---|
| Tipos estrictos | `npm run typecheck` | Sin errores |
| Dominio y aplicación | `npm run test:run` | 74 pruebas aprobadas en 9 archivos |
| Producto web | `npm run build` | 24 módulos compilados en `dist/` |
| Integración completa | `npm run validate` | Tipos, pruebas y build aprobados |

## Cobertura

- Máquina de estados: patrullaje (vértice, ciclo, inaccesible), investigación (visión, sonido, llegada, inaccesible), persecución (replan, captura, pérdida de visión), búsqueda (tiempo de espera, re-investigación), regreso (llegada, captura durante regreso) y captura (inmovilidad).
- Eventos ilegales: `stepGuardMachine` lanza error cuando el evento no corresponde al estado.
- Intenciones: `navigateIntent`, `rotateIntent`, `captureIntent`, `haltIntent` y sus invariantes.
- Simulación: patrulla cíclica completa, sonido → investigar → buscar → regresar, replan durante persecución, captura con detención, pérdida de visión → buscar, destino inaccesible → regresar, re-investigación de sonido fresco durante búsqueda.

## Riesgo residual

La interacción visual se verifica mediante compilación, pruebas unitarias y arranque HTTP, pero no cuenta aún con automatización de navegador. Los experimentos manuales siguen siendo la comprobación de presentación hasta incorporar pruebas end-to-end.