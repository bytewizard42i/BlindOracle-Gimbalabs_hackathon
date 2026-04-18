# BlindOracle — Architecture

## 1. System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                       BlindOracle Monorepo                            │
│                                                                       │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│   │  blindoracle-    │  │  blindoracle-    │  │  blindoracle-    │    │
│   │  contract        │  │  api             │  │  ui              │    │
│   │  ───────────     │  │  ──────────      │  │  ──────────      │    │
│   │  Compact:        │  │  Shared types    │  │  React + Vite    │    │
│   │  blind-oracle    │  │  Game logic      │  │  MUI + Oracle    │    │
│   │  .compact        │  │  Runtime config  │  │  theme           │    │
│   │  Witnesses       │  │  Scoring rules   │  │  Wallet connect  │    │
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
      ▲                             ▲                             ▲
      └─────────────────────────────┼─────────────────────────────┘
                                    │
                             ┌──────────────┐
                             │ Lace Wallet  │
                             │  (browser)   │
                             └──────────────┘
```

## 2. Contract Layer

**File**: [`../blindoracle-contract/compact/blind-oracle.compact`](../blindoracle-contract/compact/blind-oracle.compact)
**Compiler**: `compactc` v0.30.0
**Pragma**: `language_version >= 0.16 && <= 0.21`
**Status**: ✅ Compiles successfully via Midnight MCP compile tool (verified April 2026)

### Ledger State

| Field | Type | Sealed? | Purpose |
|-------|------|---------|---------|
| `roundPhase` | `Uint<0..6>` | No | Current round phase (0-5) |
| `roundId` | `Counter` | No | Monotonically increasing round number |
| `playerCount` | `Counter` | No | Players entered in current round |
| `answerCommitments` | `Map<Bytes<32>, Bytes<32>>` | No | player_pk → hidden answer commitment |
| `playerGuesses` | `Map<Bytes<32>, Uint<64>>` | No | player_pk → public guess value |
| `guessBucketCounts` | `Map<Uint<64>, Uint<64>>` | No | guess → number of players with that guess |
| `payouts` | `Map<Bytes<32>, Uint<64>>` | No | player_pk → final payout |
| `claimed` | `Map<Bytes<32>, Boolean>` | No | player_pk → has claimed refund/payout? |
| `revealedAnswers` | `Map<Bytes<32>, Uint<64>>` | No | God Window reveals (post-settlement) |
| `owner` | `Bytes<32>` | ✓ | Immutable admin identity |
| `stakeAmount` | `Uint<64>` | ✓ | Fixed stake per player |
| `minPlayers`, `maxPlayers` | `Uint<64>` | ✓ | Round capacity bounds |
| `maxGuessesPerNumber` | `Uint<64>` | ✓ | Anti-crowd cap |
| `guessMin`, `guessMax` | `Uint<64>` | ✓ | Valid range |
| `protocolFeeBps` | `Uint<64>` | ✓ | Fee in basis points |

### Circuits

| Circuit | Caller | Valid Phases | Purpose |
|---------|--------|--------------|---------|
| `enter_round` | Any player | Forming, Open | Commit answer + public guess |
| `lock_round` | Owner | Open | Close entry window (enough players) |
| `abort_round` | Owner | Forming | Close entry window (too few players) |
| `claim_refund` | Any player | Aborted | Reclaim stake from aborted round |
| `submit_match_result` | Owner | Locked, Settling | Record pair payout |
| `submit_unpaired_refund` | Owner | Locked, Settling | Refund unpaired player |
| `settle_round` | Owner | Settling | Finalize round |
| `reveal_for_god_window` | Any player | Settled | Reveal answer (if God Window enabled) |
| `new_round` | Owner | Settled, Aborted | Reset for next round |

### Witnesses (Private Inputs)

```compact
witness local_secret_key(): Bytes<32>;        // signing key
witness get_my_answer(): Uint<64>;            // the player's answer (private)
witness get_answer_salt(): Bytes<32>;         // commitment salt
```

### Commitment Scheme

**Answer hiding**: `persistentHash([answer_as_bytes32, salt_bytes32])`
- Hiding: Poseidon-based, indistinguishable from random without the preimage
- Binding: a different `(answer, salt)` pair produces a different commitment
- Salt required: prevents rainbow-table attacks when two players pick the same answer

**Guesses are NOT committed** — they're stored as plain `Uint<64>` in `playerGuesses`. This is the design trade-off that enables the anti-crowd cap.

---

## 3. SDK Layer

**Package**: `blindoracle-api`
**Files**:
- [`src/common-types.ts`](../blindoracle-api/src/common-types.ts) — All shared types
- [`src/game-logic.ts`](../blindoracle-api/src/game-logic.ts) — Scoring, pairing, capacity helpers
- [`src/config.ts`](../blindoracle-api/src/config.ts) — Runtime + round configs
- [`src/index.ts`](../blindoracle-api/src/index.ts) — Public SDK surface

### Key Exports

```ts
// Round state
RoundPhase { Forming, Open, Locked, Settling, Settled, Aborted }

// Config
RoundConfig { minPlayers, maxPlayers, maxGuessesPerNumber, guessMin, guessMax, ... }
DEMO_ROUND_CONFIG, STANDARD_ROUND_CONFIG, TOURNAMENT_ROUND_CONFIG

// Scoring
scoreMatch(pair, answerA, guessA, answerB, guessB, config): MatchResult

// Pairing
computeMatchPairs(playerPks, entropyHex, stakeAmount): { pairs, unpaired }

// Capacity
computeGuessCapacities(guessBucketCounts, config): GuessBucketCapacity[]
validateGuessCapacity(guess, guessBucketCounts, config): void | throws
theoreticalMaxPlayers(config): number

// Commitments
generateSalt(): Uint8Array
buildAnswerCommitmentPreview(answer, salt): { ... }
```

---

## 4. UI Layer

**Package**: `blindoracle-ui`
**Stack**:
- **React 18** + **Vite 6** — fast dev, modern bundling
- **Material-UI 6** — component library
- **Cinzel + Inter** fonts — mythic display + clean body
- **Theme**: dark violet (#9d4edd) + oracle gold (#ffd60a) on near-black (#0a0a14)

### Key Components (Planned)

- `<WalletConnect />` — Lace wallet integration, shows pk
- `<RoundStatus />` — live phase indicator, player count, capacity meter
- `<EnterRoundForm />` — pick answer (1-10), pick guess (shows capacity per number)
- `<GuessBucketDisplay />` — real-time "3/3 picked 7, full" per number
- `<WaitingRoom />` — countdown timer, other entries visible (guesses only)
- `<ResultScreen />` — per-player outcome with ZK receipt
- `<GodWindow />` — post-settlement reveal UI (if enabled)
- `<AbortRefundClaim />` — visible only in Aborted phase

### UX Flow

```
  [CONNECT WALLET]
        ▼
  [SEE ROUND STATUS]
        ▼
  [FORMING: waitlist] ─── [3 of 4 needed]
        ▼
  [OPEN: entry window] ── [enter your answer & guess]
        ▼
  [LOCKED: waiting] ────── [pairing...]
        ▼
  [SETTLED: result] ────── [outcome + proof]
        ▼
  [GOD WINDOW: reveal?] ── [opt-in show/hide]
```

---

## 5. Privacy Architecture

### What stays private (forever)

- **Your answer** — unless you choose to reveal it via God Window
- **Your signing key** — never leaves your browser
- **Your salt** — stored in localStorage keyed by roundId
- **Your identity link** — your on-chain pk is public, but real-world identity is only bound if you volunteer it

### What is public at commit time

- **Your derived public key** — yes, this is the on-chain identity
- **Your guess** — required for the anti-crowd cap
- **Your answer commitment** — hides the answer but proves you committed to one
- **Round phase + player count** — game state is transparent

### What becomes public at settlement

- **Match pairings** — who was paired with whom
- **Match outcomes** — who won / split / drew
- **Payouts** — exact amounts per player

### What becomes public at God Window (optional)

- **Revealed answers** — only for players who opt-in

### The "poker betting is public, cards are private" analogy

In poker:
- Your hand (cards) is private.
- Your bets are public — everyone sees you bet $100.

In BlindOracle:
- Your answer (target) is private — nobody sees what others try to guess.
- Your guess (prediction) is public — everyone sees what you're betting on.

This isn't a privacy compromise; it's a deliberate design. The guess MUST be public for the anti-crowd cap to work, and the guess is the LESS-sensitive half of each entry.

---

## 6. Randomness & Fair Pairing

### MVP approach (commitment-derived entropy)

```ts
entropy = SHA256(concat(sorted(playerPk + answerCommitment + guess for each player)))
pairs = deterministicShuffle(playerPks, entropy)
```

**Properties**:
- ✅ Reproducible by any verifier
- ✅ Unpredictable until lock
- ⚠️ **Grindable**: a sophisticated attacker with rapid re-commit ability could bias toward favorable pairings

### Production approach (recommended post-MVP)

**Option A — Midnight block-hash beacon**:
- At lock, the contract reads the block hash at a specific (locked-in-advance) future block.
- The block producer doesn't control which players are in the round, so biasing specific pairings is infeasible.
- Implementation: requires Midnight to expose block hashes to contracts (check current SDK).

**Option B — VRF** (Verifiable Random Function):
- A neutral third party (or MPC committee) provides entropy with a proof.
- More complex but provably unbiased.

**Option C — Two-phase commit-reveal for the seed**:
- During entry, each player commits a random seed.
- After lock, seeds are revealed and XORed to produce entropy.
- The last committer has no influence (their seed commits before others reveal).

See [`WHAT_YOURE_NOT_THINKING_ABOUT.md Problem 1`](./WHAT_YOURE_NOT_THINKING_ABOUT.md#problem-1-randomness-grinding-attack) for the full solution design.

---

## 7. Deployment Flow

```
              ┌─────────────────────────────────────────────┐
              │  1. Developer writes blind-oracle.compact   │
              └────────────────────┬────────────────────────┘
                                   ▼
              ┌─────────────────────────────────────────────┐
              │  2. `yarn compact` runs compactc            │
              │     → generates managed/ bindings (CJS)     │
              │     → declares ZK circuit keys              │
              └────────────────────┬────────────────────────┘
                                   ▼
              ┌─────────────────────────────────────────────┐
              │  3. Deployment script calls                 │
              │     deployContract() from midnight-js-      │
              │     contracts with constructor args         │
              └────────────────────┬────────────────────────┘
                                   ▼
              ┌─────────────────────────────────────────────┐
              │  4. Contract address written to             │
              │     blindoracle-ui/public/config.json       │
              └────────────────────┬────────────────────────┘
                                   ▼
              ┌─────────────────────────────────────────────┐
              │  5. Frontend loads config, shows "connect   │
              │     wallet" to interact with deployed       │
              │     contract                                │
              └─────────────────────────────────────────────┘
```

---

## 8. Infrastructure

### Local (Undeployed) Stack
- **Proof server**: `midnightnetwork/proof-server:4.0.0` on `:6300`
- **Indexer**: `midnightnetwork/indexer-standalone:2.1.0` on `:8088`
- **Node**: `midnightnetwork/midnight-node:0.13.0-alpha.2` on `:9944`
- Orchestrated via [`../undeployed-compose.yml`](../undeployed-compose.yml)

### Testnet
- Midnight Testnet-02 shared infrastructure
- Faucet: `https://faucet.testnet-02.midnight.network`
- Indexer: `https://indexer.testnet.midnight.network`

### Mainnet (Future)
- Shared mainnet infrastructure
- Contract audit REQUIRED before deployment
- See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full deployment matrix

---

## 9. Dependencies Summary

### Pinned (to match `example-zkloan`)
- `@midnight-ntwrk/compact-runtime` — `3.1.0`
- `@midnight-ntwrk/midnight-js-contracts` — `3.1.0`
- `@midnight-ntwrk/midnight-js-types` — `3.1.0`
- `@midnight-ntwrk/midnight-js-network-id` — `2.1.0`

### Framework
- Node 22
- Yarn 4 (via corepack)
- Turborepo 2
- TypeScript 5.7
- React 18 / Vite 6 / MUI 6

---

## 10. File Reference Map

| File | Purpose |
|------|---------|
| [`blindoracle-contract/compact/blind-oracle.compact`](../blindoracle-contract/compact/blind-oracle.compact) | Smart contract source |
| [`blindoracle-contract/src/witnesses.ts`](../blindoracle-contract/src/witnesses.ts) | Witness implementations |
| [`blindoracle-contract/src/index.ts`](../blindoracle-contract/src/index.ts) | TS entry point |
| [`blindoracle-api/src/common-types.ts`](../blindoracle-api/src/common-types.ts) | Shared types |
| [`blindoracle-api/src/game-logic.ts`](../blindoracle-api/src/game-logic.ts) | Scoring + pairing + capacity |
| [`blindoracle-api/src/config.ts`](../blindoracle-api/src/config.ts) | Network + round configs |
| [`blindoracle-ui/src/App.tsx`](../blindoracle-ui/src/App.tsx) | Main UI |
| [`blindoracle-ui/src/main.tsx`](../blindoracle-ui/src/main.tsx) | Theme + root |
| [`undeployed-compose.yml`](../undeployed-compose.yml) | Local Docker stack |
