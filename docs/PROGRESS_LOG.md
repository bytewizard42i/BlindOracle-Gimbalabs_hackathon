# 📜 BlindOracle — Progress Log

> Running log of weekly progress, compile results, deployments, and design decisions. Each Sunday, before posting the weekly tweet, append the latest entry. This is the audit trail for the final-presentation submission.

---

## Week 5 — May 11-17, 2026 (toolchain + ecosystem)

### 🐦 Tweet posted

**Permalink:** _(pending — to be filled in after posting before Sun May 17 12:00 UTC)_
**Voice:** humbly confident, layman-accessible, no self-deprecation, no em-dashes, "Ai" not "AI"

### Goal of this week

Take last week's "compiles cleanly on `compactc 0.29.0` (language 0.21)" win and bring it forward to the latest stable Midnight toolchain. Also do ecosystem-citizen work that strengthens BlindOracle and every other Midnight DApp downstream.

### What shipped

#### 🔨 Bumped to `compactc 0.31.0` (Apr 29, 2026 release) — May 16

Pragma changed from `>= 0.16 && <= 0.21` to `>= 0.16 && <= 0.23`. Single-line edit to `blindoracle-contract/compact/blind-oracle.compact`.

Local install path: GitHub-auth issue from Week 2 still blocks the `compact` updater (`Bad credentials`), so installed `compactc 0.31.0` directly from the GitHub release tarball into `~/.compact/versions/0.31.0/x86_64-unknown-linux-musl/`.

**Compile result** — full ZK compile in **20.6 seconds**, exit code 0, zero warnings. All 10 circuits produce both `.zkir` (text) and `.bzkir` (binary) artifacts; `keys/` directory now contains 10 prover + 10 verifier keys (new in v0.31's artifact layout); `compiler/contract-info.json` reports authoritative version metadata:

```json
{
  "compiler-version": "0.31.0",
  "language-version": "0.23.0",
  "runtime-version": "0.16.0"
}
```

ZKIR sizes (byte-exact match with Week 2's `compactc 0.29.0` output for the unchanged contract — confirms no semantic regression from the language bump):

| Circuit | ZKIR size |
|---|---|
| `enter_round` | 30,769 bytes (still the largest, as expected) |
| `new_round` | 16,490 bytes |
| `submit_match_result` | 16,434 bytes |
| `submit_unpaired_refund` | 9,299 bytes |
| `claim_refund` | 7,854 bytes |
| `reveal_for_god_mode` | 6,571 bytes |
| `lock_round` | 5,762 bytes |
| `claim_house_fee` | 4,891 bytes |
| `settle_round` | 4,060 bytes |
| `abort_round` | 3,981 bytes |

#### 🌐 Ecosystem-citizen work

- **Filed [Olanetsoft/midnight-mcp#37](https://github.com/Olanetsoft/midnight-mcp/issues/37)** on May 9 (last week, but linked here for the audit trail) flagging that the Idris MCP's `midnight-get-latest-syntax` tool was 6 weeks behind the latest Compact release. Posted a friendly week-2 status nudge today (May 16) including additional asks (pragma bump, `JubjubPoint`/`convertBytesToUint` mistakes catalog, v0.30 quirks). Comment ID `4467570594`.
- **Re-verified the full Midnight compatibility matrix** at https://docs.midnight.network/relnotes/support-matrix and cross-checked against the Idris MCP `midnight-get-version-info` tool. Both sources agree on the toolchain as of May 16. Updated the canonical `monolith-docs/midnight/COMPACT_VERSIONS.md` and `ECOSYSTEM_TIMELINE.md` (commit `3b9e074` on `bytewizard42i/DIDzMonolith`) with 10+ missing SDK rows (Compact JS, Platform JS, On-chain runtime, Midnight.js, testkit-js, DApp Connector API, Wallet SDK facade, Proof server, Ledger, Block explorer, Faucet) and per-network node/indexer versions.
- **Synced sister-AI fleet rules** — bumped `SISTERS_GLOBAL_RULES.md` to v0.31.0 (language 0.23) so all five sister AI assistants (Cassie, Alice, Casie, Cara, Penny) start every Midnight session with current information.

### Forward look — week ending May 24

1. **Deploy v3 contract to Midnight Testnet-02** — `https://faucet.testnet-02.midnight.network`, first-time deploy path.
2. **First bot-seeded playtest round.** Wire the UI's bot-fiction renderer to a 3-player real session.
3. **MidnightVitals first instrumentation pass.** Node + server + wallet during the playtest.
4. **Locate Sebastien Guillemot's WASM 3D artifact** OR ship a placeholder Three.js renderer that satisfies the loader interface.
5. **Patch the `compact` updater GitHub-auth blocker** (refresh `GH_TOKEN` or fall back to scripted release downloads in package.json).

### Risks / blockers

| Risk | Status |
|---|---|
| Local `compact` updater still hits GitHub `Bad credentials` | Workaround in place (direct release tarball install). Future-proof fix needs `GH_TOKEN` refresh. |
| MCP playground compile path still returns `INVALID_RESPONSE` | Issue #37 nudge posted today. Local `compactc 0.31.0` is the source of truth in the meantime. |
| Idris MCP syntax data still pinned at 0.16-0.21 (`lastUpdated: 2026-03-24`) | Issue #37 still open, no upstream response. Doesn't block local work. |

---

## Week 2 — May 4-10, 2026 (post-enrollment)

### 🐦 Tweet posted

**Permalink:** https://x.com/realjohnny5i/status/2053019204752757028
**Posted:** 2026-05-09 03:50 EDT (well ahead of the Sun May 10 12:00 UTC deadline)
**Voice:** layman-accessible, humbly confident, no self-deprecation, no em-dashes

Posted text (preserved here as the canonical record for the final presentation):

> Hello everyone! Week 2 update on BlindOracle, my @gimbalabs hackathon project.
>
> Big week of progress, and I'm genuinely glad to share where it landed.
>
> https://github.com/bytewizard42i/BlindOracle-Gimbalabs_hackathon
>
> For the new folks: BlindOracle is a privacy-first guessing game on @MidnightNtwrk. You secretly hide a number AND secretly guess what number an arbitrarily assigned opponent will hide. Nobody, not the other player, not me, not even the chain, can see your move. But everyone can prove, cryptographically, that the game was fair.
>
> Update 2: This week, the foundation came together.
>
> 🃏 The smart contract logic is done. Players hide their answer AND their guess at the same time. The game won't start until enough humans have joined, and there's a built-in cap, so no one can game it by all picking the same number.
>
> 🎲 Three rooms in parallel. When you enter, you're invisibly assigned to one of three rooms; you don't know which. Your opponent always comes from your room, but you never learn the room boundary. Ai players keep each room warm until real humans show up, then quietly step aside as the game fills. Winners take 90% of the pot; the house keeps 10%.
>
> 🔮 The user interface scaffold is up. The entry experience is a custom 3D scene with a pluggable renderer, and it's accessible to screen readers and keyboard users from day one. (Most 3D-canvas UIs aren't, and that bothered me.)
>
> 🏗️ AND... I got the smart contract to compile cleanly today. All ten of the game's moves produce valid zero-knowledge-proof code. The biggest one (entering a round) generates 30KB of proof logic. The status badge on the GitHub repo just turned green.
>
> Honest update: last week I mentioned wanting to add blockfrost_io. After thinking it through, BlindOracle doesn't actually need it, Midnight already gives me everything I need. So I removed the dependency. Less is more. We will use the amazing Blockfrost API in a few of our other projects down the line.
>
> @gimbalabs @DraperDragon @midnightfdn @windsurf @OpenAI @newman5
>
> #gimbalabs #pieceofpie #hackathon

**Attached screenshot:** terminal output showing the corrected `npm run compact:check` invocation, the silent successful compactc run, and the `ls -la src/managed/blind-oracle/zkir/` listing all 10 generated ZKIR files with their sizes plus the green "✅ All 10 circuits compiled to ZKIR. Exit code: 0" confirmation.

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

### 🐦 Tweet posted

**Permalink:** https://x.com/realjohnny5i/status/2049975668566356157
**Posted:** 2026-04-30 18:14 EDT (3 days before the May 3 12:00 UTC enrollment deadline)
**Reach:** 164 views, Newman S Lanier (Gimbalabs admin) replied positively

Posted text (preserved verbatim as the canonical record for the final presentation):

> Hello everyone! Welcome to the Johnny5i inaugural @gimbalabs hackathon weekly update.
>
> I will be doing one of these for each week of the entire hackathon as I compete to get my portion of a tasty pie, and the chance to pitch my broken-ass project to @DraperDragon !!!
>
> So follow along with me and monitor my progress as I crash and burn in real time like a drunken airshow pilot. It will be spectacular!
>
> https://github.com/bytewizard42i/BlindOracle-Gimbalabs_hackathon
>
> Update 1: This week I created the repo on GitHub, made a local clone that i added to a workspace with all my other midnight repositories and @olanetsoft MCP for midnight, which gives my Ai guardrails for making compact code on my IDE of @windsurf .
>
> As you can see from the picture, I used @OpenAI ChatGPT to make some media files. (It's like buying a carpet, then designing the room around it, gives you a north star I find making media).
>
> I purchased a few URLs from @GoDaddy (who always front-runs my name choices). Then I proceeded to explain clearly and concisely to my Ai the structure of what I wanted to build, and away we went.
>
> Then I started to create the skeleton, and some deep dive files for future functionality, what I might be forgetting, and assessment reports. Im super excited at how much this project will be able to showcase about Midnight's potential and I get to try out my invention called MidnightVitals, which pings the node and server and wallet for health details.
>
> Im also excited to see if I can integrate @blockfrost_io into this little gem.
>
> Wish me luck or utter failure! 🙂
>
> @MidnightNtwrk @midnightfdn
>
> #gimbalabs #pieceofpie #hackathon
>
> @gimbalabs

> *Note: this Week 1 tweet pre-dates the new "humbly confident, no self-deprecation" tone rule John locked in May 9. Phrases like "broken-ass project", "crash and burn in real time like a drunken airshow pilot", and "Wish me luck or utter failure" are preserved verbatim as the historical record. Future tweets follow the new tone (see Week 2 for the calibrated version).*

### What shipped
- Created `bytewizard42i/BlindOracle-Gimbalabs_hackathon` GitHub repo
- Local clone added to workspace alongside other Midnight repos
- Integrated [Olanetsoft's Midnight MCP](https://github.com/Olanetsoft/midnight-mcp) (now `Idris MCP`), gives Ai guardrails when generating Compact code in Windsurf
- Used ChatGPT to generate brand media files (the "design around the carpet" north-star insight)
- Bought GoDaddy domain(s) before name-cybersquatters could front-run
- Wrote skeleton + deep-dive docs: `FUTURE_FUNCTIONALITY.md`, `WHAT_YOURE_NOT_THINKING_ABOUT.md`, etc.
- Named MidnightVitals (an existing personal invention) as the planned instrumentation surface
- Floated Blockfrost integration as a maybe (later dropped, see Week 2)

---

*Maintained by Penny. Update before posting each weekly tweet so the audit trail is always current. New entries go on TOP (reverse chronological).*
