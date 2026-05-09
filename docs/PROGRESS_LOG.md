# 📜 BlindOracle — Progress Log

> Running log of weekly progress, compile results, deployments, and design decisions. Each Sunday, before posting the weekly tweet, append the latest entry. This is the audit trail for the final-presentation submission.

---

## Week 2 — May 4-10, 2026 (post-enrollment)

### Goal of this week
Match my Week 1 narrative with code reality. Get the v3 contract from "scaffolded" to "compiles cleanly", set up reproducible compile tooling, and prepare for Testnet-02 deployment + first bot-seeded playtest.

### What shipped

#### 🃏 v2 contract mechanics (committed Apr 18 in `623a269`)
- **Answer / guess split** — separate commitments for what you're hiding (`answer`) vs what you're betting your opponent picked (`guess`). The PR commit message: `feat: v2 contract mechanics — answer/guess split, min-player gating, anti-crowd cap`.
- **Min-player gating** — round can't activate until `poolMinRealPlayers` reached.
- **Anti-crowd cap** — at most `maxGuessesPerNumber` players per (pool, guess) value. Stops coordinated dogpiles.

#### 🎲 v3 contract — three-pool architecture (committed Apr 18 in `81efe6b`)
- **3 parallel pools.** Players invisibly assigned to one of 3 via deterministic round-robin (`nextPoolToAssign` counter). The UI does not display pool membership.
- **AI bots seed pools during Forming** so the experience feels active from entry one. **Bots are pure UI fiction** — the contract never records or reasons about them. As real players arrive, the UI simulates "bot knockouts" to maintain the illusion. Keeps the contract simple, cheap, auditable.
- **Per-pool readiness gate** — Forming → Open transitions auto-trigger when `poolsReadyCount == poolCount`.
- **90/10 split** — winners take 90% of each pair's pot; 10% accumulates in `houseFeeAccumulated` for owner claim post-settlement.
- **Same-pool matching enforced on-chain** — `submit_match_result` asserts `playerPool[A] == playerPool[B]`.

#### 🔮 Oracle Canvas scaffold (committed Apr 21 in `f059f07`)
- HTML-in-Canvas single-screen entry surface. DOM children stay live (full screen-reader + keyboard nav).
- Pluggable WASM 3D renderer interface in `blindoracle-ui/src/oracle-canvas/wasm3d-loader.ts`:
  ```ts
  interface Wasm3dOracle {
    init(canvas: HTMLCanvasElement): Promise<void>;
    setMood(mood: 'dormant' | 'awakening' | 'judging' | 'revealing'): void;
    setEntryFormTexture(image: ImageBitmap | HTMLElement): void;
    dispose(): void;
  }
  ```
  — ready to drop in Sebastien Guillemot's WASM 3D demo when the artifact is located.
- Sibling pattern documented for proofOrBluff and any future DIDzMonolith DApp that wants HTML-in-Canvas.

#### ❌ Honest pivot — Blockfrost dependency dropped (Apr 21, `f059f07` design decisions)
In Week 1's tweet I named Blockfrost as a planned integration. After thinking it through, BlindOracle does **not** need Blockfrost — Midnight gives the indexer surface I need natively. Removing the dependency:
- **Cleaner ZK story** — every read goes through Midnight's contract state, no off-chain trusted reads
- **Fewer moving parts** — no API keys, no rate limits, no separate failure mode
- **Faster path to Testnet-02 deploy** — one less integration to wire up

This is the kind of subtraction that improves the architecture more than addition would.

#### ⚙️ Tooling fix — `compact` npm script was broken (May 9)
The `blindoracle-contract/package.json` `compact` script was:
```
compactc compile compact/blind-oracle.compact --output src/managed
```
This is **wrong syntax** — `compactc` takes positional args, not a `compile` subcommand or `--output` flag. Anyone trying `yarn compact` would have hit an error. Fixed to:
```json
"compact": "compactc compact/blind-oracle.compact src/managed/blind-oracle",
"compact:check": "compactc --skip-zk compact/blind-oracle.compact src/managed/blind-oracle",
```
Added a `:check` variant for fast skip-zk validation during development.

#### ✅ Contract compiles cleanly — first verified compile (May 9, 03:19 UTC-04)

Ran the contract through local `compactc 0.29.0` in skip-zk mode:

```
$ compactc --skip-zk compact/blind-oracle.compact src/managed/blind-oracle
$ echo $?
0
```

Output produced:

| Path | Description |
|---|---|
| `out/compiler/contract-info.json` | 4.3 KB ledger-state schema (also copied to `docs/CONTRACT_INFO.json` as committed evidence) |
| `out/contract/index.d.ts` | 7.1 KB TypeScript bindings (auto-generated) |
| `out/contract/index.js` | 386 KB compiled JS module |
| `out/zkir/*.zkir` | 10 ZK Intermediate Representation files, one per exported circuit |

**ZKIR file sizes (proxy for circuit complexity):**

| Circuit | ZKIR size |
|---|---|
| `enter_round` | 30,697 bytes (largest — pool assignment + duplicate check + range gates + bucket cap + readiness logic + auto-phase-advance) |
| `submit_match_result` | 16,490 bytes |
| `new_round` | 16,467 bytes |
| `submit_unpaired_refund` | 9,299 bytes |
| `claim_refund` | 7,854 bytes |
| `reveal_for_god_mode` | 6,571 bytes |
| `lock_round` | 5,762 bytes |
| `claim_house_fee` | 4,891 bytes |
| `settle_round` | 4,060 bytes |
| `abort_round` | 3,981 bytes |

**Compile metadata** (from `contract-info.json`):
- Compiler version: `0.29.0`
- Language version: `0.21.0`
- Runtime version: `0.14.0`
- 10 exported circuits, all with `proof: true` (real ZK circuits)
- 25 ledger items (15 exported, 10 sealed configuration)

#### 🪜 Status badge bumped: `scaffolded` → `compiles clean`
README badge updated from red `scaffolded` to green `compiles clean`. Truthful as of this Sunday's commit.

### Forward look — week ending May 17

1. **Update local toolchain** to `compactc 0.31.0` (language 0.23.0, released Apr 29). Currently blocked on `compact` updater hitting GitHub auth issues — needs token refresh. When unblocked, bump pragma to `>= 0.16 && <= 0.23`.
2. **Deploy v3 contract to Midnight Testnet-02.** Faucet at `https://faucet.testnet-02.midnight.network`. First-time path; expect to learn things.
3. **First bot-seeded playtest round.** Wire the UI's bot-fiction renderer to a 3-player real session. Capture screenshots for next Sunday's tweet.
4. **MidnightVitals** — instrument node + server + wallet during the playtest. If anything wobbles I want to see it before the players do.
5. **Locate Sebastien Guillemot's WASM 3D artifact** and validate the loader interface works against it. Fallback: write a placeholder Three.js renderer that satisfies the same interface, so the loader has something to load on Day 1.

### Risks / blockers logged

| Risk | Mitigation |
|---|---|
| Local `compact` updater can't reach GitHub (auth: "Bad credentials") | Refresh `GH_TOKEN` env or the keychain entry; fallback to manual download from GitHub releases |
| MCP playground compile path returns `INVALID_RESPONSE` even on the trivial counter template | Static analysis (`mcp8_midnight-extract-contract-structure`) still works for syntax checks; local `compactc 0.29.0` produces real artifacts. Documented in `docs/MCP_PLAYGROUND_NOTE.md` (TBD) |
| Idris MCP syntax data pinned at language 0.16-0.21 (last update 2026-03-24) | Filed for awareness; doesn't block work since local compile is the source of truth |
| Sebastien's WASM 3D artifact not yet located | Placeholder Three.js renderer keeps Day-1 demo viable |

---

## Week 1 — Apr 27 - May 3, 2026 (registration)

> *Captured from the Apr 30, 2026 tweet at 6:14 PM (UTC-04). Newman S Lanier (Gimbalabs admin) replied positively, calling out the "design around the carpet" insight as a great example of a hackathon update.*

### What shipped
- Created `bytewizard42i/BlindOracle-Gimbalabs_hackathon` GitHub repo
- Local clone added to workspace alongside other Midnight repos
- Integrated [Olanetsoft's Midnight MCP](https://github.com/Olanetsoft/midnight-mcp) (now `Idris MCP`) — gives the AI guardrails when generating Compact code in Windsurf
- Used ChatGPT to generate brand media files (the "design around the carpet" north-star insight)
- Bought GoDaddy domain(s) before name-cybersquatters could front-run
- Wrote skeleton + deep-dive docs: `FUTURE_FUNCTIONALITY.md`, `WHAT_YOURE_NOT_THINKING_ABOUT.md`, etc.
- Named MidnightVitals (an existing personal invention) as the planned instrumentation surface
- Floated Blockfrost integration as a maybe (later dropped — see Week 2)

### Tweet permalink
*To be filled in once located on x.com/realjohnny5i — search "Johnny5i inaugural @gimbalabs hackathon weekly update" or check Apr 30 evening post.*

---

*Maintained by Penny. Update before posting each weekly tweet so the audit trail is always current. New entries go on TOP (reverse chronological).*
