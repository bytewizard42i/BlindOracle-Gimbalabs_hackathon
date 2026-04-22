# BlindOracle — Design Decisions

Living record of "why we chose X, and why not Y." Update whenever a meaningful architectural choice gets made or revisited.

---

## 🚫 Blockfrost — NOT USED (and not needed)

**Date**: April 21, 2026
**Status**: Decided. Revisit only if requirements change.

### TL;DR

BlindOracle does **not** use Blockfrost. The game is self-contained in a single Compact contract + wallet + midnight.js SDK. Adding Blockfrost would violate KISS without solving any real problem.

### What would Blockfrost give us?

Blockfrost's Midnight Indexer offers:
1. GraphQL queries over historical blocks / transactions / contract actions
2. WebSocket subscriptions to chain events
3. Node RPC relay (midnight.js compatible)
4. Shielded-transaction scanning with viewing keys
5. DUST generation status queries

### What does BlindOracle actually need?

| Need | Source | Blockfrost required? |
|---|---|---|
| Read the contract's ledger state | midnight.js `ContractStateObservable` via wallet's Node RPC | ❌ No |
| Call contract circuits (enter_round, claim_refund, etc.) | midnight.js `submitTransaction` through Lace | ❌ No |
| Player's own wallet balance | Lace extension | ❌ No |
| Compute commitments off-chain | `persistentHash` via `@midnight-ntwrk/compact-runtime` | ❌ No |
| Historical round analytics | Not in MVP scope | — |
| Real-time block streaming | Not in MVP scope (contract state observation is enough) | — |
| Shielded tx scanning | Not used — game uses commitment pattern, not shielded coins | — |

Every piece of data the game needs is available from:
- **The contract itself** (ledger reads via midnight.js)
- **The wallet** (player identity + balance)
- **The player's own browser** (answer, salt, commitment computation)

### Why say no?

1. **KISS.** One less service, one less API key, one less failure mode at demo time.
2. **No vendor in the critical path.** The game works anywhere a Midnight node + Lace wallet work.
3. **Privacy.** No third party sees traffic patterns of who's entering which round.
4. **Demo reliability.** Every external dependency is a potential demo-day disaster at the Gimbalabs stage.

### What about observability of the game?

If we ever want production observability for BlindOracle (is the contract healthy? is the round stuck in `Settling`?), we use **ZKSplunk** — our sibling project that already does ZK-aware Splunk observability. ZKSplunk uses Blockfrost internally, but BlindOracle itself stays clean.

### When would we reconsider?

- Ranked/leaderboard modes that require cross-round historical analysis
- A public stats page with lifetime payouts
- Epoch-based night rounds that need block-height-driven auto-lock triggers
- Tournament bracket mode with multi-round state machines

All of these are post-MVP, post-hackathon features. For the Gimbalabs submission, **no Blockfrost**.

---

## 🎨 Oracle Canvas — HTML-in-Canvas + WASM 3D

**Date**: April 21, 2026
**Status**: Scaffolded, awaiting Sebastien's WASM artifact.

### The vision

BlindOracle's landing and entry flow centers on a **slowly rotating 3D oracle** — a crystal / orb / obsidian object that visually anchors the game. Over it sits the player's entry form (secret number, guess). The form must be **fully interactive and accessible** — you have to be able to type, tab, read with screen readers.

Traditionally you'd have to pick: 3D canvas (pretty, inaccessible) vs HTML overlay (accessible, no depth integration). The new **HTML-in-Canvas** API (Chrome 148 Beta, April 2026) eliminates the trade-off.

### The three-layer plan

```
┌────────────────────────────────────────────────────────┐
│  <canvas layoutsubtree>                                │
│                                                        │
│    ┌──────────────────────────────────────────────┐   │
│    │  WASM 3D oracle (WebGL / WebGPU target)      │   │
│    │  — Sebastien Guillemot's experimental artifact│   │
│    │  — renders the rotating oracle                │   │
│    │  — texture receives HTML children via         │   │
│    │    texElementImage2D                          │   │
│    └──────────────────────────────────────────────┘   │
│                                                        │
│    <div class="oracle-entry-form">                     │
│      <input /> <button />                              │
│      (still interactive, accessible, tab-orderable)   │
│    </div>                                              │
│  </canvas>                                             │
└────────────────────────────────────────────────────────┘
```

Three APIs in play:
1. **`layoutsubtree` attribute** on `<canvas>` — opts children into the browser's layout engine (no paint, keeps DOM accessibility)
2. **`drawElementImage` (2D) / `texElementImage2D` (WebGL/WebGPU)** — paints the child element into the canvas
3. **`paint` event** — fires when child HTML updates, so we re-render that region

Spec: https://github.com/WICG/html-in-canvas · Live demo / IDL: https://wicg.github.io/html-in-canvas/

### Current browser support (Apr 2026)

- **Chrome 148 Beta / Canary** — enable via `chrome://flags/#canvas-draw-element`
- Firefox / Safari — not yet implemented
- **Fallback strategy**: feature-detect at load time; if unsupported, render the HTML form over (not inside) the canvas with `position: absolute`. Identical UX, minus the 3D-material-mapped aesthetic.

### Where Sebastien's WASM 3D fits

His WASM 3D artifact is the *renderer* inside the canvas. We leave a plug-in interface in `blindoracle-ui/src/oracle-canvas/wasm3d-loader.ts` — once you locate his repo, we point the loader at it. The interface is deliberately minimal:

```ts
interface Wasm3dOracle {
  init(canvas: HTMLCanvasElement): Promise<void>;
  setMood(mood: 'dormant' | 'awakening' | 'judging' | 'revealing'): void;
  setEntryFormTexture(image: ImageBitmap | HTMLElement): void;
  dispose(): void;
}
```

Any WASM module that implements this shape drops in. If Sebastien's artifact has a different shape, we write a thin adapter.

### Where to look for Sebastien's artifact

- https://github.com/SebastienGllmt — his personal GH
- https://github.com/dcSpark (Paima Studios — his current org)
- https://github.com/Emurgo — former Cardano org
- His X/Twitter / conference talks often link the demo URL

### Accessibility note

Because the HTML children of the canvas **stay in the DOM** (they just also get painted into the canvas), screen readers and keyboard navigation work unchanged. This is the whole point of the proposal — previous canvas-only forms were a WCAG dead-end.

---

## 💾 Monorepo shape

- `blindoracle-contract/` — Compact + TS witnesses
- `blindoracle-api/` — shared types + game logic (pure functions)
- `blindoracle-ui/` — React + Vite + MUI
- `blindoracle-ui/src/oracle-canvas/` (NEW) — HTML-in-Canvas + WASM 3D module

Rule: any cross-package code goes through `blindoracle-api`. The UI never imports contract internals directly — only the typed surface.

### Sibling pattern

The `oracle-canvas/` module is the reference scaffold for any DIDzMonolith
project that wants HTML-in-Canvas + WASM 3D. proofOrBluff will lift this
pattern into its shared UI layer (see
`proofOrBluff/docs/DESIGN_DECISIONS_HTML_IN_CANVAS.md`) when its UI is
built. If the two projects end up with material duplication, we promote
the shared bits to a workspace package (e.g. `@pixypi/html-in-canvas-react`).

Note: BlindOracle is a single-screen entry experience, so it does *not*
use demoLand / realDeal — the canvas IS the experience. proofOrBluff is
multi-screen with persistent character state and therefore follows its
shared-UI / demoLand / realDeal protocol strictly.

---

*Last updated: April 21, 2026*
