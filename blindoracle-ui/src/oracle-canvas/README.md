# Oracle Canvas

The 3D focal element of BlindOracle. Renders an experimental WASM 3D
oracle (or a 2D fallback) with optional accessible HTML children rendered
*inside* the canvas via the new **HTML-in-Canvas** API (Chrome 148+).

## Files

| File | Role |
|---|---|
| `OracleCanvas.tsx` | React component; feature-detects HIC, mounts the renderer, manages rAF loop |
| `wasm3d-loader.ts` | Pluggable loader — returns either Sebastien's WASM adapter or the fallback |
| `types.ts` | `Wasm3dOracle` interface that any 3D renderer must implement |
| `index.ts` | Public barrel export |

## Usage

```tsx
import { OracleCanvas } from './oracle-canvas';

function RoundEntryScreen() {
  return (
    <OracleCanvas mood="awakening" width={640} height={640}>
      <form>
        <label>
          Your secret number
          <input type="number" inputMode="numeric" min="1" max="100" />
        </label>
        <label>
          Your guess
          <input type="number" inputMode="numeric" min="1" max="100" />
        </label>
        <button type="submit">Commit</button>
      </form>
    </OracleCanvas>
  );
}
```

When HIC is supported, the `<form>` renders **inside** the canvas with
full accessibility (screen readers, tab order, keyboard input) while the
WASM renderer can optionally sample it as a texture on the oracle's
surface. When unsupported, the form overlays the canvas — identical UX,
no texture mapping.

## Moods

| Mood | When |
|---|---|
| `dormant` | Pre-round landing |
| `awakening` | Player is filling out the entry form |
| `judging` | Round is in Locked/Settling |
| `revealing` | God Window is active |

## Enabling HTML-in-Canvas in Chrome

1. Chrome Canary or Beta, version 148+
2. Visit `chrome://flags/#canvas-draw-element`
3. Set to **Enabled**
4. Restart Chrome

Verify with: in DevTools console, `document.createElement('canvas').getContext('2d').drawElementImage` should be a function.

## Integrating Sebastien's WASM 3D artifact

When you locate the artifact:

1. Drop the `.wasm` bundle + its JS glue into `blindoracle-ui/public/wasm/oracle-3d/`
2. Create `blindoracle-ui/src/oracle-canvas/wasm3d-sebastien-adapter.ts` exporting a default `Wasm3dOracleFactory` (see `types.ts` for the interface)
3. In `wasm3d-loader.ts`, flip `USE_WASM_ORACLE` to `true` (or wire it to a Vite env flag like `VITE_USE_WASM_ORACLE`)
4. Remove the `@ts-expect-error` line now that the adapter exists

The adapter's job is to translate our simple `Wasm3dOracle` interface
(init / setMood / render / dispose) into whatever API Sebastien's module
exposes. If his artifact is a WebGL renderer, use `texElementImage2D`
inside `setEntryFormElement` to map the form onto the oracle's surface.
If it's a WebGPU renderer, use the GPU equivalent.

## References

- **HTML-in-Canvas spec**: https://wicg.github.io/html-in-canvas/
- **WICG repo**: https://github.com/WICG/html-in-canvas
- **Chrome flag**: `chrome://flags/#canvas-draw-element`

## Browser fallback strategy

| Browser | Behavior |
|---|---|
| Chrome 148+ (flag on) | HIC path — form lives inside `<canvas layoutsubtree>` |
| Chrome (flag off) | Fallback path — form overlays canvas absolutely |
| Firefox / Safari (all) | Fallback path |

Feature detection happens once at component mount; no runtime cost.
