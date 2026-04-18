# BlindOracle — Architecture (v3, Pooled)

## 1. System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                       BlindOracle Monorepo                            │
│                                                                       │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│   │  blindoracle-    │  │  blindoracle-    │  │  blindoracle-    │    │
│   │  contract        │  │  api             │  │  ui              │    │
│   │  ───────────     │  │  ──────────      │  │  ──────────      │    │
│   │  Compact:        │  │  Types           │  │  React + Vite    │    │
│   │  blind-oracle    │  │  Per-pool logic  │  │  MUI theme       │    │
│   │  .compact        │  │  90/10 scoring   │  │  Pool obfuscation│    │
│   │  Witnesses       │  │  Bot simulator   │  │  God Mode UI     │    │
│   └────────┬─────────┘  └─────────┬────────┘  └────────┬─────────┘    │
│            │                      │                    │              │
│            └──────────────────────┴────────────────────┘              │
│                                   │                                   │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │
      ┌─────────────────────────────┼─────────────────────────────┐
      ▼                             ▼                             ▼
┌────────────┐             ┌────────────────┐            ┌──────────────┐
│   Proof    │             │    Indexer     │            │   Midnight   │
│   Server   │             │    :8088       │            │     Node     │
│   :6300    │             │   (GraphQL)    │            │    :9944     │
└────────────┘             └────────────────┘            └──────────────┘
```

## 2. Contract Layer

**File**: [`../blindoracle-contract/compact/blind-oracle.compact`](../blindoracle-contract/compact/blind-oracle.compact)
**Compiler**: `compactc` v0.30.0
**Pragma**: `language_version >= 0.16 && <= 0.21`
**Status**: ✅ Compiles successfully via Midnight MCP compile tool (verified April 2026)

### Ledger State

**Round state (dynamic)**:

| Field | Type | Purpose |
|-------|------|---------|
| `roundPhase` | `Uint<0..6>` | Current phase (0-5) |
| `roundId` | `Counter` | Monotonically increasing round number |
| `playerCount` | `Counter` | Total real players entered |
| `answerCommitments` | `Map<Bytes<32>, Bytes<32>>` | player_pk → hidden answer commitment |
| `playerGuesses` | `Map<Bytes<32>, Uint<64>>` | player_pk → public guess |
| `guessBucketCounts` | `Map<Bytes<32>, Uint<64>>` | `hash(pool, guess)` → count (per-pool cap) |
| `payouts` | `Map<Bytes<32>, Uint<64>>` | player_pk → final payout |
| `claimed` | `Map<Bytes<32>, Boolean>` | player_pk → claim status |
| `revealedAnswers` | `Map<Bytes<32>, Uint<64>>` | God Mode reveals (post-settlement) |

**Pool state (dynamic)**:

| Field | Type | Purpose |
|-------|------|---------|
| `playerPool` | `Map<Bytes<32>, Uint<64>>` | player_pk → assigned pool (0..poolCount) |
| `poolRealCounts` | `Map<Uint<64>, Uint<64>>` | pool_id → real player count |
| `poolReady` | `Map<Uint<64>, Boolean>` | pool_id → reached min? |
| `poolsReadyCount` | `Counter` | How many pools are ready |
| `nextPoolToAssign` | `Uint<64>` | Round-robin assignment pointer |

**Fee accounting**:

| Field | Type | Purpose |
|-------|------|---------|
| `houseFeeAccumulated` | `Uint<64>` | Sum of house fees from all settled pairs |

**Sealed configuration**:

| Field | Type | Purpose |
|-------|------|---------|
| `owner` | `Bytes<32>` | Immutable admin pk |
| `stakeAmount` | `Uint<64>` | Fixed stake per player |
| `poolCount` | `Uint<64>` | Number of pools (default 3) |
| `poolMinRealPlayers` | `Uint<64>` | Per-pool minimum for readiness |
| `poolMaxRealPlayers` | `Uint<64>` | Per-pool cap |
| `poolBotSeedCount` | `Uint<64>` | UI bot count per pool (display only) |
| `maxGuessesPerNumber` | `Uint<64>` | Anti-crowd cap per `(pool, guess)` |
| `guessMin`, `guessMax` | `Uint<64>` | Valid range |
| `protocolFeeBps` | `Uint<64>` | House fee (default 1000 = 10%) |

### Circuits

| Circuit | Caller | Valid Phases | Purpose |
|---------|--------|--------------|---------|
| `enter_round` | Any player | Forming, Open | Commit answer + public guess, auto-assign pool |
| `lock_round` | Owner | Open | Close entries (requires all pools ready) |
| `abort_round` | Owner | Forming | Close entries (too few players) |
| `claim_refund` | Any player | Aborted | Reclaim full stake |
| `submit_match_result` | Owner | Locked, Settling | Record per-pair payout + house fee |
| `submit_unpaired_refund` | Owner | Locked, Settling | Refund odd-pool player |
| `settle_round` | Owner | Settling | Finalize round |
| `claim_house_fee` | Owner | Settled | Zero `houseFeeAccumulated` (off-chain moves coins) |
| `reveal_for_god_mode` | Any player | Settled | Reveal own answer (with salt verification) |
| `new_round` | Owner | Settled, Aborted | Reset for next round |

### Witnesses (Private Inputs)

```compact
witness local_secret_key(): Bytes<32>;        // signing key
witness get_my_answer(): Uint<64>;            // the player's answer (private)
witness get_answer_salt(): Bytes<32>;         // commitment salt
```

### Helper Circuits

```compact
// Canonical Compact pk derivation (public_key() is NOT a builtin)
pure circuit derive_caller_pk(sk: Bytes<32>): Bytes<32> { ... }

// Composite key for per-pool bucket counters
pure circuit bucket_key(pool: Uint<64>, guess: Uint<64>): Bytes<32> {
  persistentHash([(pool as Field) as Bytes<32>, (guess as Field) as Bytes<32>])
}
```

### Commitment Scheme

**Answer hiding**: `persistentHash<Vector<2, Bytes<32>>>([answer_bytes, salt])`
- **Hiding**: Poseidon-based, indistinguishable from random without preimage
- **Binding**: different `(answer, salt)` → different commitment
- **Salt required**: prevents rainbow-table attacks when two players pick the same answer

**Guesses are NOT committed** — stored plain in `playerGuesses`. This enables the anti-crowd cap.

---

## 3. The Pool System

### Round-robin assignment

The `nextPoolToAssign` counter advances after every entry, wrapping at `poolCount`. Given N entries, player N lands in pool `N mod poolCount`.

```
Entry 1: pool 0 (counter 0→1)
Entry 2: pool 1 (counter 1→2)
Entry 3: pool 2 (counter 2→0 wrap)
Entry 4: pool 0 (counter 0→1)
...
```

### Pool readiness gating

Each pool tracks a `poolReady` boolean. When `poolRealCounts[pool] >= poolMinRealPlayers`, the flag flips true and `poolsReadyCount` increments. When `poolsReadyCount >= poolCount`, the round auto-advances from Forming to Open.

### Same-pool matching enforcement

`submit_match_result` asserts `playerPool[A] == playerPool[B]`. This prevents cross-pool matching errors by the off-chain matcher.

### Per-pool anti-crowd

Each `(pool, guess)` pair has its own counter, keyed by `persistentHash([pool, guess])`. Cap enforced at entry time.

---

## 4. The Bot System (Off-Chain)

Bots are **not stored on-chain**. They exist only in the UI's imagination. The contract has `poolBotSeedCount` as a sealed config value purely so every client generates consistent bot counts.

### Bot generation

```ts
simulateBotEntries(poolId, count, config, seed): PlayerEntry[]
```

Deterministic LCG seeded by `(poolId, index, seed)`. Produces:
- Fake pk like `0xbot_0_0001_000...`
- Placeholder commitment
- Random in-range guess

### Bot "knockout" animation

When a real player enters pool X, the UI removes one bot from pool X's displayed entries. Net visible player count stays the same; the ratio of "real : bot" shifts toward real.

### Why this design?

- **Cheap**: zero on-chain gas for fake data
- **Simple**: no bot management circuits
- **Auditable**: open-source `simulateBotEntries()` — anyone can verify bots aren't rigged
- **Honest**: real settlement never involves bots

---

## 5. SDK Layer

**Package**: `blindoracle-api`

### Key exports

```ts
// Round state
RoundPhase { Forming, Open, Locked, Settling, Settled, Aborted }
PoolState { poolId, realPlayerCount, isReady, displayBotCount, guessBucketCounts }
RoundSnapshot, RoundSummary

// Config
RoundConfig { poolCount, poolMinRealPlayers, poolMaxRealPlayers, poolBotSeedCount, ... }
DEMO_ROUND_CONFIG, STANDARD_ROUND_CONFIG, TOURNAMENT_ROUND_CONFIG

// Scoring (90/10 split)
scoreMatch(pair, answerA, guessA, answerB, guessB, config): MatchResult
// MatchResult now includes houseFee field

// Per-pool pairing
computePoolMatchPairs(playerPksByPool, entropyHex, stakeAmount): { pairs, unpaired }
groupEntriesByPool(entries): Map<PoolId, string[]>

// Per-pool capacity
computePoolGuessCapacities(guessBucketCounts, config): GuessBucketCapacity[]
computeAggregatedCapacities(guessBucketCounts, config): AggregatedGuessCapacity[]
isPoolFull, isPoolReady, totalRealPlayerCapacity, totalMinimumRealPlayers

// Bot simulation
simulateBotEntries(poolId, count, config, seed): PlayerEntry[]

// Commitments
generateSalt(): Uint8Array
buildAnswerCommitmentPreview(answer, salt): { ... }
```

---

## 6. UI Layer

**Package**: `blindoracle-ui`
**Stack**: React 18, Vite 6, MUI 6, Cinzel + Inter fonts, violet/gold on near-black.

### Key UI principles

1. **Pool obfuscation**: never show which pool the current player is in. Aggregate pool displays.
2. **Bot realism**: bots look like real entries during Forming. Labeled "(bot)" only post-round.
3. **Capacity clarity**: aggregated "X slots remaining for number 7" across all pools.
4. **Pool readiness gauge**: "2 of 3 pools ready" prominent during Forming.
5. **God Mode drama**: slow reveal animation, numbers appear one at a time.

### Key components (planned)

- `<WalletConnect />` — Lace wallet integration
- `<RoundStatus />` — phase indicator, pool readiness gauge
- `<EnterRoundForm />` — answer + guess inputs with capacity-aware disabling
- `<AggregatedCapacityDisplay />` — shows per-number availability across pools
- `<PoolSimulatedView />` — visual pool feeds with bot entries (UI fiction)
- `<WaitingRoom />` — countdown, live entries stream, your own status
- `<ResultScreen />` — your outcome with ZK receipt
- `<GodModeReveal />` — post-settlement opt-in reveal UI
- `<AbortRefundClaim />` — visible only in Aborted phase

---

## 7. Privacy Architecture

### What stays private (forever)

- **Your answer** — unless you opt-in to God Mode
- **Your signing key** — never leaves your browser
- **Your salt** — stored in localStorage keyed by roundId

### What is public at commit time

- **Your derived public key** — on-chain identity
- **Your guess** — required for anti-crowd cap
- **Your answer commitment** — hides value, proves commitment
- **Your pool assignment** — technically public but UI hides it

### What is public at settlement

- **Match pairings** — who was paired with whom
- **Match outcomes** — payouts per player
- **Pool assignments** — visible in round summary

### What becomes public at God Mode (optional)

- **Revealed answers** — only for players who opt-in

---

## 8. Randomness & Pairing

### Pool assignment

**Current (MVP)**: round-robin via on-chain counter. Observable and order-dependent.

**Future**: hash-based `pool = hash([pk, round_entropy]) mod poolCount`. Removes observer-predictability.

### Per-pool pairing

After lock, the off-chain matcher:
1. Queries `playerPool` for every player
2. Groups players by pool
3. Per pool: deterministic Fisher-Yates shuffle seeded by `sha256(entropy || pool_id)`
4. Pairs `(shuffled[0], shuffled[1]), (shuffled[2], shuffled[3]), ...`
5. If odd, the last player is unpaired

The entropy source in MVP is commitment-derived (grindable). Production should use a Midnight block-hash beacon. See [`WHAT_YOURE_NOT_THINKING_ABOUT.md Problem 1`](./WHAT_YOURE_NOT_THINKING_ABOUT.md#problem-1-randomness-grinding-attack).

---

## 9. Settlement Flow

```
LOCKED
  │
  │ off-chain matcher groups by pool, shuffles each
  │ submits each pair via submit_match_result(A, B, payoutA, payoutB, houseFee)
  │ submits unpaired via submit_unpaired_refund(pk)
  │
SETTLING (first submit_match_result transitions)
  │
  │ all pairs submitted; all unpaired handled
  │ owner calls settle_round()
  │
SETTLED
  │
  ├─ owner calls claim_house_fee() to zero counter
  │  (off-chain service moves NIGHT from contract to owner)
  │
  ├─ players optionally call reveal_for_god_mode(pk, answer, salt)
  │
  └─ owner calls new_round() → Forming
```

---

## 10. Infrastructure

### Local (Undeployed)
- Proof server `:6300`, Indexer `:8088`, Node `:9944`
- Orchestrated via [`../undeployed-compose.yml`](../undeployed-compose.yml)

### Testnet
- Midnight Testnet-02, faucet at `https://faucet.testnet-02.midnight.network`

### Mainnet
- Contract audit REQUIRED
- Oracle design resolved (see `WHAT_YOURE_NOT_THINKING_ABOUT.md Problem 3`)

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full deployment matrix.

---

## 11. Dependencies

### Pinned (matches `example-zkloan`)
- `@midnight-ntwrk/compact-runtime@3.1.0`
- `@midnight-ntwrk/midnight-js-contracts@3.1.0`
- `@midnight-ntwrk/midnight-js-types@3.1.0`
- `@midnight-ntwrk/midnight-js-network-id@2.1.0`

### Framework
- Node 22, Yarn 4, Turborepo 2, TypeScript 5.7
- React 18, Vite 6, MUI 6

---

## 12. File Map

| File | Purpose |
|------|---------|
| [`blindoracle-contract/compact/blind-oracle.compact`](../blindoracle-contract/compact/blind-oracle.compact) | Compact contract |
| [`blindoracle-contract/src/witnesses.ts`](../blindoracle-contract/src/witnesses.ts) | Witness implementations |
| [`blindoracle-api/src/common-types.ts`](../blindoracle-api/src/common-types.ts) | Types incl. PoolState, PoolId |
| [`blindoracle-api/src/game-logic.ts`](../blindoracle-api/src/game-logic.ts) | scoring, pooled pairing, bot simulator |
| [`blindoracle-api/src/config.ts`](../blindoracle-api/src/config.ts) | DEMO/STANDARD/TOURNAMENT configs |
| [`blindoracle-ui/src/App.tsx`](../blindoracle-ui/src/App.tsx) | Main UI |
| [`undeployed-compose.yml`](../undeployed-compose.yml) | Local Docker stack |
