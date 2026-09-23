---
id: laboratorio-guardia-sigilo-h4-maquina-estados
titulo: Máquina de estados del guardia
tipo: laboratorio
nivel: obligatorio
audiencia: estudiante
resultados: [RA7, RA8, RA11]
prerrequisitos: [laboratorio-guardia-sigilo-producto, laboratorio-guardia-sigilo-h3-percepcion-movimiento]
evaluable: true
acceso: publico
version: 1
---

# Máquina de estados del guardia

## Propósito

H4 automatiza la conducta del guardia con una máquina de estados de dominio puro. La decisión (dónde ir y qué hacer) queda separada de la navegación, la percepción, la memoria y la locomoción, y cada transición queda registrada en telemetría observable.

## Parámetros de la demostración

| Parámetro | Valor |
|---|---:|
| Velocidad del guardia | 115 px/s |
| Alcance visual | 220 px |
| Campo visual | 90 grados |
| Radio sonoro | 190 px |
| Duración del sonido | 800 ms |
| Mirada por dirección | 500 ms |
| Búsqueda limitada | 3000 ms |
| Puntos de patrulla | (2,17) y (27,17) |

## Estados y transiciones

```text
                   visión
        ┌───────── Perseguir ───── pérdida de visión ─┐
        │            ▲             │                  ▼
        │            │ visión      │             Buscar (último punto)
        ▼            │             │                  │
   Patrullar         │             │      búsqueda agotada
        ▲            │ sonido sin  │                  ▼
        │            │ visión      │             Regresar
        └────────────┴─────────────┴── al llegar ─┘ (patrulla más cercana)
                     Investigar ──► Buscar
```

- `Patrullar`: recorre los puntos de patrulla; al llegar, mira en las 4 direcciones (N, E, S, O) con percepción activa.
- `Investigar`: un sonido oído sin visión lo lleva a la posición del sonido.
- `Perseguir`: una visión válida lo lleva a seguir al jugador; replanifica al cambiar el objetivo o agotar la ruta.
- `Buscar`: en el último punto conocido, mirada giratoria y búsqueda por tiempo limitado.
- `Regresar`: vuelve al punto de patrulla de menor costo A* y retoma el ciclo.

Prioridad de percepción: visión > sonido. La última posición conocida cambia sólo ante una percepción válida.

## Controles

- WASD o flechas: mover al jugador.
- Espacio: alternar BFS y A* en las rutas del guardia.
- Q: emitir un sonido desde la posición del jugador.
- P: pausar la simulación.
- N: avanzar un paso en pausa.
- R: recuperar el estado inicial reproducible.

## Evidencia observable

- El HUD muestra el estado actual, la fase (AVANZANDO/MIRANDO) y las últimas 3 transiciones con su causa.
- Los cuadrados verdes marcan los puntos de patrulla.
- La línea celeste muestra la ruta activa del guardia.
- El cono gira con la mirada; el marcador rojo indica el último punto conocido.
- El guardia patrulla solo, persigue por visión, investiga sonidos y vuelve a patrulla tras agotar la búsqueda.

## Experimentos reproducibles

1. Dejar al guardia patrullar: observar la secuencia Patrullar → MIRANDO → Patrullar entre los dos puntos.
2. Situar al jugador delante del guardia dentro del cono: transición a `Perseguir` (evento `vision-acquired`).
3. Esconderse detrás de una pared y presionar Q estando cerca: el guardia investiga (evento `sound-heard`).
4. Perder la visión durante la persecución: el guardia va al último punto conocido y busca (evento `lost-sight`, luego `search-timeout`).
5. Esperar el fin de la búsqueda: el guardia regresa al punto de patrulla más cercano (evento `return-to-patrol`).
6. Presionar P para pausar y N para avanzar de a un paso y verificar la telemetría cuadro a cuadro.

## Límite del hito

El guardia no captura al jugador en este hito; la persecución finaliza al perder la percepción. La captura queda para un hito posterior.