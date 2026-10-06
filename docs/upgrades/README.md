---
id: laboratorio-upgrades-indice
titulo: Upgrades del catalogo — indice y punto inicial
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Upgrades del catalogo

Carpeta por upgrade del catalogo de la consigna "Laboratorio de intervencion agéntica completa". Cada paquete contiene `spec.md`, `plan.md` y `evidencia.md`. La consigna exige completar al menos cinco upgrades distintos; esta preparacion habilita los diez.

## Puerta de trabajo

```text
intencion declarada → requisito verificable → spec revisada
→ plan aprobado → build → evidencia
```

Un prompt no reemplaza la spec. Ningun codigo avanza sin spec revisada y plan aprobado.

## Punto inicial

- Fecha: 2026-10-06.
- Rama: `Laboratorio-de-intervencion-agentica-completa`.
- Commit: `f80466cf59fdf6d89dea612dfb8dc7ee03cc032a` ("H4: maquina de estados del guardia con telemetria").
- Entorno: node v24.16.0, npm 12.0.2, Windows.
- Cambios preexistentes sin commitear (conservados, no revertidos):
  - `Prompts/Req.md` — prompt de exploracion del upgrade 02.
  - `src/game/scenes/GameScene.ts` — usa `coneStyleFor` al dibujar el cono.
  - `src/game/presentation/coneStyle.ts` — sin trackear.
  - `tests/presentation/coneStyle.test.ts` — sin trackear.
- Validacion de referencia: `npm run validate` → exit 0 (typecheck, 10 archivos / 69 pruebas, build `dist/`).
  Advertencia conocida del build: chunk principal 1505.79 kB supera el limite de 500 kB de Vite (preexistente, fuera de alcance de los upgrades).

## Estado de preparacion

Commits posteriores al punto inicial, autorizados por el humano:

- `eb16205` — estructura de los 10 upgrades, plantillas y punto inicial (solo `docs/`).
- `ecaa013` — upgrade 02 en curso: estilo del cono de vision por estado
  (`Prompts/Req.md`, `src/game/scenes/GameScene.ts`, `src/game/presentation/coneStyle.ts`,
  `tests/presentation/coneStyle.test.ts`).

Validacion posterior: `npm run validate` → exit 0 (10 archivos / 69 pruebas, build OK).
El codigo del upgrade 01 no tiene commits propios: proviene del baseline `f80466c` (ver trazabilidad en su spec).

## Catalogo

| N. | Upgrade | Carpeta | Aporte | Estado |
|---:|---|---|---|---|
| 01 | Patrulla con pausas y mirada direccional | `01-patrulla-pausas-mirada/` | Anticipacion visual y ritmo del recorrido | documentado; pendiente decision humana y C7 visual |
| 02 | Cono de vision visible y reactivo | `02-cono-vision-reactivo/` | Claridad de alcance y amenaza | documentado (`ecaa013`); pendiente decision humana y C7 visual |
| 03 | Animaciones por estado y transicion | `03-animaciones-estado-transicion/` | Representacion coherente de la conducta | spec pendiente |
| 04 | Impacto visual extremo de alerta | `04-alerta-visual-extrema/` | Shake, flash, zoom, particulas o equivalente | spec pendiente |
| 05 | Camara dinamica de tension | `05-camara-tension/` | Encuadre util durante un momento de riesgo | spec pendiente |
| 06 | Cobertura y ruptura de linea de vision | `06-cobertura-ruptura-linea-vision/` | Decision activa de sigilo | spec pendiente |
| 07 | Distractores sonoros interactivos | `07-distractores-sonoros/` | Oportunidad y planificacion para el jugador | spec pendiente |
| 08 | Medidor de alerta y estados del nivel | `08-medidor-alerta-estados/` | Consecuencias visibles del peligro | spec pendiente |
| 09 | Escape de ultimo momento | `09-escape-ultimo-momento/` | Feedback de alivio ante una maniobra ajustada | spec pendiente |
| 10 | Puertas, atajos o rutas bloqueables | `10-puertas-atajos-rutas/` | Transformacion del espacio y la estrategia | spec pendiente |

## Ciclo por upgrade

1. Spec revisada y guardada (Prompt 1).
2. Plan aprobado por incrementos (Prompt 2).
3. Un incremento por vez: validar y revisar el diff antes de continuar.
4. Validacion y cierre con matriz criterio → evidencia (Prompt 3).
5. Decision humana: integrar, corregir, revertir o descartar.

Plantillas reutilizables: `docs/plantillas/spec-upgrade.md`, `docs/plantillas/plan-upgrade.md`, `docs/plantillas/evidencia-upgrade.md`.
