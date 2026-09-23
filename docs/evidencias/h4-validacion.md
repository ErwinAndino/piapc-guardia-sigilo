---
id: laboratorio-evidencia-validacion-h4
titulo: Evidencia de validación H4
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia de validación H4

- Fecha: 23 de septiembre de 2026.
- Entorno: Windows, Node.js 22, npm.
- Versión evaluada: cambios H4 (Sistema de patrullaje del guardia).

| Criterio | Método | Resultado |
|---|---|---|
| Tipos estrictos | `npm run typecheck` | Sin errores |
| Dominio, aplicación y telemetría | `npm run test:run` | 62 pruebas aprobadas en 9 archivos |
| Producto web | `npm run build` | 23 módulos compilados en `dist/` |
| Integración completa | `npm run validate` | Tipos, pruebas y build aprobados |

## Cobertura nueva

- Comportamiento: patrulla, mirada en 4 direcciones, interrupción de mirada por visión, sonido que inicia Investigar, prioridad visión sobre sonido, pérdida de visión que inicia Buscar, vencimiento de búsqueda, regreso a patrulla, recuperación ante destino inaccesible, validación de entradas.
- Telemetría: registro ordenado, últimos eventos, rechazo de entradas inválidas.
- Integración: persecución por visión, investigación por sonido oculto, y secuencia completa perseguir → perder vista → buscar → regresar → patrullar.
- Regresión: las suites de navegación, percepción, memoria, seguimiento y aplicación previas continúan aprobadas.

## Riesgo residual

La interacción visual se verifica mediante compilación y pruebas de simulación, pero no cuenta aún con automatización de navegador. Los experimentos manuales del documento H4 siguen siendo la comprobación de presentación hasta incorporar pruebas end-to-end.