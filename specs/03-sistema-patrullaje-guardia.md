---
id: laboratorio-guardia-sigilo-sistema-patrullaje
titulo: Sistema de patrullaje del guardia
tipo: especificacion
nivel: obligatorio
audiencia: estudiante
resultados: [RA7, RA8, RA11]
prerrequisitos: [laboratorio-guardia-sigilo-producto, laboratorio-guardia-sigilo-h3-percepcion-movimiento]
evaluable: true
acceso: publico
version: 1
---

# Especificación: Sistema de patrullaje del guardia

## Objetivo

Automatizar la conducta del guardia mediante una máquina de estados de dominio puro con los estados Patrullar, Investigar, Perseguir, Buscar y Regresar, manteniendo separadas percepción, memoria, decisión, búsqueda y seguimiento, y emitiendo telemetría observable en cada transición.

## Alcance

### Comportamiento del guardia

- Patrulla cíclica entre 2 puntos configurables: `[{ x: 2, y: 17 }, { x: 27, y: 17 }]` en `labLevel.ts`.
- Al llegar a un punto de patrulla, mira en las 4 direcciones cardinales (N, E, S, O). La mirada rota `facing`, el cono de visión gira y la percepción permanece activa: una detección válida interrumpe la mirada.
- La visión del jugador dispara Perseguir.
- Un sonido oído sin visión simultánea registra su posición y dispara Investigar (refuerza la memoria).
- Al perder al jugador, el guardia se dirige al último punto visto, busca allí en forma limitada y, si no recupera la percepción, vuelve al punto de patrulla más cercano.
- El "punto de patrulla más cercano" se elige por menor costo de ruta A* (`totalCost`).
- El guardia no captura al jugador en este hito: Perseguir finaliza sólo al perder la percepción. La captura queda fuera de alcance.

### Estados y transiciones

- `Patrullar`: recorre los puntos de patrulla con A*; al llegar ejecuta la mirada en 4 direcciones. Una percepción visual válida pasa a `Perseguir`; un sonido oído sin visión pasa a `Investigar`.
- `Investigar`: navega hasta la posición registrada por sonido o última posición conocida y luego ejecuta `Buscar`.
- `Perseguir`: persigue la última posición conocida con replanificación cada 1 s; una percepción visual válida actualiza la memoria; al perder la percepción pasa a `Buscar` (destino: último punto visto).
- `Buscar`: en el último punto conocido, mirada en 4 direcciones; si encuentra al jugador vuelve a `Perseguir`; si agota el tiempo limite pasa a `Regresar`.
- `Regresar`: navega al punto de patrulla de menor costo A*; un destino inaccesible produce una recuperación explícita y registra la transición.

### Parámetros de la demostración

| Parámetro | Valor |
|---|---:|
| Velocidad del guardia | 115 px/s |
| Alcance visual | 220 px |
| Campo visual | 90 grados |
| Radio sonoro | 190 px |
| Duración del sonido | 800 ms |
| Mirada por dirección | 500 ms |
| Búsqueda limitada | 3000 ms |
| Replanificación | Al cambiar el objetivo o al agotar la ruta |

### Arquitectura prevista

- `src/domain/behavior/`: máquina de estados pura (entradas: estado, memoria, observaciones y tiempo; salida: transición y acción deseada).
- `src/domain/telemetry/`: eventos estructurados `{ timeMs, previous, event, next, cause }` y registro de transiciones.
- `src/application/simulation/`: orquesta percepción (existe), decisión y seguimiento.
- `src/game/scenes/GameScene.ts`: adapta Phaser; presenta estados, acción y telemetría sin decidir reglas.

### Observabilidad

- Estado actual y anterior, evento y causa que produjo cada transición.
- Ruta actual, objetivo y último punto conocido.
- Registro de transiciones visible sin leer el código.
- Pausa y avance controlado para demostraciones (reutiliza los mecanismos existentes).

## Fuera de alcance

- Captura del jugador.
- Arte, animaciones o audio de producción.
- Behavior trees, Utility AI o GOAP.
- Generación procedural o multijugador.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador; importar módulos de dominio no produce efectos laterales.
- `src/application/` coordina el dominio y no representa la escena.
- `src/game/` adapta Phaser y no decide reglas de comportamiento.
- La última posición conocida cambia sólo ante una percepción válida; visión tiene prioridad sobre sonido.
- No agregar dependencias. TypeScript en modo estricto. Pruebas de dominio ejecutables en Node.
- No usar red, no acceder a secretos, no publicar ni efectuar commits sin autorización.

## Criterios de aceptación

1. `npm run validate` finaliza correctamente.
2. Existen pruebas de dominio y aplicación que cubren: patrulla con cierre de ciclo, llegada con mirada en 4 direcciones, sonido que dispara Investigar, visión que dispara Perseguir, pérdida de visión que dispara Buscar, búsqueda agotada que dispara Regresar, elección del punto de patrulla más cercano por costo A*, mirada interrumpida por visión y destino inaccesible con recuperación explícita.
3. La regresión de H2/H3 (navegación, percepción, memoria, seguimiento) continúa aprobada.
4. Cada transición emite un evento de telemetría con estado anterior, evento, estado nuevo y causa.
5. La compilación `npm run build` no contiene errores de tipos.

## Evidencia prevista

- Salida de `npm run test:run` con las suites de H4 y la regresión de H2/H3.
- `docs/evidencias/h4-validacion.md` con el formato de `docs/evidencias/h3-validacion.md`.
- `docs/h4-maquina-estados.md` con experimentos reproducibles y capturas de telemetría.
- Trazabilidad de las transiciones: secuencia de eventos de telemetría que explique por qué ocurrió cada cambio de estado.