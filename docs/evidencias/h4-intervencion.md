---
id: laboratorio-evidencia-intervencion-h4
titulo: Registro de intervención H4
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Registro de intervención H4

- Fecha: 14 de septiembre de 2026.
- Estado inicial: H3 completado, commit `e14a1c6`.
- Objetivo: incorporar máquina de estados con patrullaje, investigación, persecución, búsqueda y regreso, más telemetría de transiciones en HUD.
- Herramienta: OpenCode.
- Modelo declarado: `opencode/big-pickle`.

## Decisiones

| Decisión | Motivo | Control humano |
|---|---|---|
| Dominio puro para la máquina | Permite pruebas unitarias sin Phaser | Archivos `guardMachine.ts`, `guardStates.ts` en `domain/behavior/` |
| Prioridad visión > sonido en derivación | La visión entrega posición directa del jugador | Pruebas de secuencia con ambos estímulos |
| Captura en H4.3 | Requiere distancia mínima y visión activa para ser justa | Evento `capture-reached` con guarda `captureDistancePx` |
| Búsqueda como giro de mirada en LKP | Evita navegación aleatoria y es observable | 4 fases cardinales, duración configurable |
| Telemetría en HUD | Comprensión inmediata del estado para pruebas manuales | Labels en español, última transición visible |
| Captura detiene movimiento | Evita que el guardia se mueva tras capturar al jugador | Estado `captured` omite movimiento y derivación de eventos |

## Archivos creados

- `src/domain/behavior/guardMachine.ts` — máquina de estados con 6 estados y 12 eventos.
- `src/domain/behavior/guardStates.ts` — tipos, eventos y constructores de intención.
- `src/domain/behavior/patrol.ts` — avance cíclico de puntos de patrulla.
- `src/domain/telemetry/transitionLog.ts` — registro y consulta de la última transición.
- `src/application/simulation/guardSimulation.ts` — simulación autónoma del guardia.

## Archivos modificados

- `src/application/simulation/labLevel.ts` — constantes H4 (puntos de patrulla, distancias, duraciones).
- `src/game/scenes/GameScene.ts` — conducta autónoma, HUD de telemetría, sin clic.

## Archivos de prueba

- `tests/behavior/guardMachine.test.ts` — 24 pruebas de transiciones e invariantes.
- `tests/behavior/patrol.test.ts` — 3 pruebas de ciclo y alcanzabilidad.
- `tests/application/guardSimulation.test.ts` — 8 pruebas de secuencias completas.

## Correcciones surgidas de revisión

- Las transiciones en `stepGuardMachine` debían crear un nuevo estado con `current` actualizado, no reutilizar el estado anterior.
- El estado `captured` debe omitir derivación de eventos para evitar errores de eventos ilegales.
- `perception.state` (no `perception`) se asigna al estado de simulación porque `updatePerceptionSimulation` devuelve un `PerceptionFrame`.

## Límites pendientes

- No existe todavía una prueba automatizada de navegador.
- La advertencia de tamaño del paquete Phaser se acepta para el laboratorio.
- El guardia no recuerda la última posición conocida entre reinicios.
