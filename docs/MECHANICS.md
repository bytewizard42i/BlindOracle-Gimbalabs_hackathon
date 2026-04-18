# BlindOracle — Game Mechanics (v3, Pooled)

**Authoritative reference for the BlindOracle ruleset.**
Read this first if you're implementing a client, writing tests, or analyzing the protocol.

---

## 1. Vocabulary — Read This Twice

BlindOracle has exactly **two numbers** per player per round. They look similar. They are not.

### `answer` — the hidden target
- The number a player locks in **for OTHER players to try to guess**.
- **PRIVATE.** Stored on-chain only as a hiding commitment (`persistentHash([answer_bytes, salt])`).
- **NEVER capacity-capped.** Every player chooses freely. Capping answers would shrink the population of potential winners.
- Revealed (optionally) only during **God Mode** after settlement.

### `guess` — the player's prediction
- The number a player is **betting their opponent's answer will be**.
- **PUBLIC at commit time.** Stored directly on-chain as a plain `Uint<64>`.
- **CAPACITY-CAPPED per pool.** At most `maxGuessesPerNumber` players per pool may choose any single guess value.
- Why public? Because the cap is what it exists for, and enforcing a cap requires the chain to know the value. "Poker betting is public, cards are private."

If you ever find yourself writing "secret guess" — **stop**. One is private (`answer`), the other public (`guess`).

---

## 2. The Three Pools

The signature mechanic of BlindOracle v3. Borrowed from backroom poker tables: players never know which table they're on.

### How it works

- At deployment, the contract is configured with `poolCount` pools (default: 3).
- Each pool has its own real-player counter, its own anti-crowd cap tally, and its own readiness flag.
- When a player enters, they are **automatically assigned** to a pool via a round-robin counter (`nextPoolToAssign`).
- The pool assignment is recorded on-chain (`playerPool` Map) but the UI **does not display** it. You don't know which pool you're in.
- Matching later happens **only within each pool**, so your opponent is always from your pool.

### Why hide pool membership?

1. **Anti-collusion** — two players who want to collude cannot reliably land in the same pool.
2. **Strategic obfuscation** — you can't time your entry to land in a specific pool.
3. **Fairness illusion** — every pool looks symmetric to the player; no pool is visibly "better."

### Why not one big pool?

- **Scalability**: three smaller matchings parallelize better than one giant matching.
- **Risk isolation**: a griefing attack on one pool doesn't poison the whole round.
- **Psychology**: three pools filling simultaneously feels more active than one pool filling slowly.

### Pool readiness

A pool becomes **ready** when its real-player count reaches `poolMinRealPlayers`. The round auto-transitions Forming → Open only when **all pools are ready**.

If one pool is stuck below minimum after the entry window closes, the owner calls `abort_round` — and every player in every pool can claim a full refund.

---

## 3. The Bots (Off-Chain UI Fiction)

**Bots exist only in the UI. The contract never sees them.**

### Why?

During the Forming phase, pools look awkwardly empty ("1 of 4"). This kills early-round energy. To fix this, the UI **pre-populates each pool's visual display** with `poolBotSeedCount` fake entries — numbers, commitments, everything — to make pools feel active.

### How

The client library (`blindoracle-api/src/game-logic.ts`) exposes:
```ts
simulateBotEntries(poolId, count, config, seed): PlayerEntry[]
```

This generates deterministic pseudo-entries with fake public keys (prefixed `0xbot_`), fake commitments, and random in-range guesses. These are purely visual.

### The "knockout" illusion

When a real player enters a pool, the UI removes one bot from its display — same net count, just one more "real" and one fewer "bot." The transition is animated, making it feel like the real player is replacing the bot.

### Why off-chain?

1. **Cheaper** — no on-chain storage for fake data
2. **Simpler** — no bot management circuits (removal, purging, cleanup)
3. **Auditable** — the `simulateBotEntries()` function is open source; anyone can verify bots aren't manipulating real outcomes
4. **Honest** — real settlement never involves bots, so there's nothing to hide

### Can a player tell which entries are bots?

Not during Forming (that would defeat the purpose). But after the round, the UI can label revealed bot entries as "(bot)" so players can see the recruitment fiction for what it was.

---

## 4. Round Lifecycle

```
     ┌──────────┐   all pools reach min      ┌──────────┐
     │ FORMING  │───────────────────────────▶│   OPEN   │
     │   (0)    │                            │    (1)   │
     └────┬─────┘                            └─────┬────┘
          │                                        │
          │ owner: abort_round()                   │ owner: lock_round()
          │ (entry window expired below minimum)   │ (ready to start)
          ▼                                        ▼
     ┌──────────┐                            ┌──────────┐
     │ ABORTED  │                            │  LOCKED  │
     │   (5)    │                            │    (2)   │
     └────┬─────┘                            └─────┬────┘
          │                                        │
          │ every player: claim_refund()           │ owner: submit_match_result()
          │                                        │ (once per pair, per pool)
          ▼                                        ▼
     [refunds distributed]                   ┌──────────┐
                                             │ SETTLING │
                                             │    (3)   │
                                             └─────┬────┘
                                                   │ owner: settle_round()
                                                   ▼
                                             ┌──────────┐
                                             │ SETTLED  │
                                             │    (4)   │
                                             └─────┬────┘
                                                   │ owner: claim_house_fee()
                                                   │ players: reveal_for_god_mode() (optional)
                                                   │ owner: new_round()
                                                   ▼
                                             [next Forming]
```

### Phase-by-phase

- **Forming**: one or more pools below min. Accepting entries; auto-advances when all pools ready.
- **Open**: all pools at or above min. Still accepting entries up to per-pool max.
- **Locked**: no more entries. Off-chain matching service computes per-pool pairings.
- **Settling**: match results being submitted. First call auto-transitions Locked → Settling.
- **Settled**: owner has called `settle_round`. House fee claimable, God Mode opens.
- **Aborted**: entry window expired below minimum. Everyone refunded.

---

## 5. Identity & Authorization

Every circuit that modifies ledger state uses the canonical Compact pattern:

```compact
const sk = local_secret_key();                          // witness
const caller_pk = persistentHash<Vector<2, Bytes<32>>>([
  pad(32, "midnight:pk:"),
  sk
]);
```

The derived `caller_pk` is compared to the expected identity:
- **Owner-only circuits** (`lock_round`, `abort_round`, `submit_match_result`, `settle_round`, `claim_house_fee`, `new_round`): must equal `owner`.
- **Player circuits** (`enter_round`, `claim_refund`, `reveal_for_god_mode`): must equal the `player_pk` parameter.

---

## 6. The Anti-Crowd Cap (Per-Pool)

Each `(pool, guess)` combination has `maxGuessesPerNumber` slots. Once full, that number is rejected in that pool.

### Composite key pattern

```compact
pure circuit bucket_key(pool: Uint<64>, guess: Uint<64>): Bytes<32> {
  const pool_bytes = (pool as Field) as Bytes<32>;
  const guess_bytes = (guess as Field) as Bytes<32>;
  return persistentHash<Vector<2, Bytes<32>>>([pool_bytes, guess_bytes]);
}
```

Each unique `(pool, guess)` pair gets its own counter in `guessBucketCounts`.

### Example

Range 1-10, `maxGuessesPerNumber = 3`, 3 pools:

```
POOL 0  |  Guess:  1  2  3  4  5  6  7  8  9 10
        | Picked:  0  1 [3] 0  1  0  0  2  1  0     ← bucket 3 FULL in pool 0
POOL 1  |  Guess:  1  2  3  4  5  6  7  8  9 10
        | Picked:  1  0  2  1  0  0  1  0  1  0
POOL 2  |  Guess:  1  2  3  4  5  6  7  8  9 10
        | Picked:  0  0  1  0 [3] 0  2  1  0  0     ← bucket 5 FULL in pool 2
```

The UI shows this as an aggregated availability display to the player (who doesn't know their pool), summing availability across all pools.

---

## 7. Round-Robin Pool Assignment

```compact
const assigned_pool = nextPoolToAssign;
// ... record entry in this pool ...
const next_candidate = (assigned_pool + 1) as Uint<64>;
if (next_candidate >= poolCount) {
  nextPoolToAssign = 0;
} else {
  nextPoolToAssign = next_candidate;
}
```

### Properties

- **Deterministic** — given the order of entries, assignment is reproducible.
- **Order-dependent** — if you enter first, you get pool 0; second, pool 1; third, pool 2; fourth, pool 0 again.
- **Unpredictable in practice** — because players don't control order precisely, they can't reliably target a pool.
- **Observable on-chain** — the `nextPoolToAssign` counter is public; a sophisticated player could time their entry to target a specific pool.

### Caveat

If `nextPoolToAssign` points to a full pool, the entry fails. Player must retry; during their retry, another entry might advance the counter, putting them in a different pool. This is chaotic but correct.

**Future enhancement**: hash-based pool assignment (`hash(pk, round_entropy) mod poolCount`) removes observer-predictability entirely. See `WHAT_YOURE_NOT_THINKING_ABOUT.md`.

---

## 8. Settlement — 90/10 Split

For a matched pair `(A, B)` in the same pool, with stake amount `S`:

```
pot = 2 × S
houseFee = pot × protocolFeeBps / 10000   // default 1000 = 10%
winnersPool = pot - houseFee              // = 1.8 × S at 10%
```

| `gA == aB`? | `gB == aA`? | Outcome | Payouts |
|---|---|---|---|
| ✓ | ✗ | A wins | A: `winnersPool` (1.8S), B: `0` |
| ✗ | ✓ | B wins | A: `0`, B: `winnersPool` (1.8S) |
| ✓ | ✓ | Split | A: `winnersPool / 2` (0.9S), B: `winnersPool / 2` (0.9S) |
| ✗ | ✗ | Draw | A: `S - houseFee/2` (0.95S), B: `S - houseFee/2` (0.95S) |

### House fee accumulation

Each `submit_match_result` call records the pair's `houseFee` in the `houseFeeAccumulated` ledger field. The owner claims the total via `claim_house_fee()` after settlement.

### Special cases

- **Unpaired player** (odd pool size): full refund of `S`, no fee. Called via `submit_unpaired_refund`.
- **Aborted round**: full refund of `S`, no fee. Called via `claim_refund` by each player.

---

## 9. God Mode (Post-Settlement Reveal)

> *The oracle knows. You did not. Now you may see.*

After `settle_round`, players can optionally reveal their original `(answer, salt)` via:

```compact
reveal_for_god_mode(player_pk, answer, salt)
```

The contract verifies the preimage:
```compact
computed = persistentHash([(answer as Field) as Bytes<32>, salt])
assert(computed == storedCommitment, "Commitment mismatch")
```

If valid, the answer is written to `revealedAnswers` and becomes public. Players now see what their opponent actually had — the dramatic climax.

### Four modes (configured per-round)

| Mode | Behavior |
|------|----------|
| `Disabled` | No reveal. Answers stay secret forever. |
| `OptIn` | Each player chooses whether to reveal. |
| `FullReveal` | All players socially expected to reveal. |
| `Delayed` | Reveals happen automatically after a time delay. |

### Salt requirement

The salt is **NOT stored on-chain**. Players must save it locally (wallet/localStorage keyed by roundId) at commit time to reveal later. Lost salt → cannot reveal.

---

## 10. Fairness Properties

### What the contract guarantees

- ✅ Every player's answer is hidden until they choose to reveal (or never)
- ✅ Every player's guess is publicly committed before matching
- ✅ Nobody can change their commitment after submission
- ✅ Nobody can enter twice
- ✅ Per-pool anti-crowd cap enforced
- ✅ Minimum players per pool before round activates
- ✅ Matching happens within pools only (same-pool verified on-chain)
- ✅ 90/10 split enforced via house fee accounting
- ✅ Refunds cleanly handled for aborts + unpaired players
- ✅ All state transitions ZK-proven

### What the contract does NOT (yet) guarantee

- ❌ Pairing randomness is grinding-resistant (see `WHAT_YOURE_NOT_THINKING_ABOUT.md Problem 1`)
- ❌ Pool assignment is unobservable (counter is public; hash-based would fix)
- ❌ Collusion prevention (two players coordinating)
- ❌ Sybil resistance (KYCz integration planned)

---

## 11. Complete Example Round

**Config**: `DEMO_ROUND_CONFIG` — 3 pools × 4 min × 8 max × 6 bots, range 1-10, cap 2, zero fee.

### Forming

Round starts. UI displays 3 pools, each with 6 bot entries (so each pool looks "6/8 filled"). Real player count: 0/12.

1. **Alice** enters with `answer=7`, `guess=3`. Auto-assigned to pool 0. UI removes one bot from pool 0. Pool 0 now: 5 bots + 1 real = 6/8 visual; 1 real actual.
2. **Bob** enters with `answer=2`, `guess=7`. Auto-assigned to pool 1. UI removes a bot from pool 1.
3. **Carol** enters with `answer=7`, `guess=3`. Auto-assigned to pool 2. UI removes a bot.
4. **Dave** through **Kelly** enter (8 more entries). After 11 total, round is still Forming because not every pool has reached min 4 real.
5. **Liam** enters as the 12th real player. Every pool now has 4 real players. Phase auto-transitions to **Open**.

### Open

Entry window continues. Each pool can accept up to 8 real players (so max 24 total). Players trickle in up to cap or window expiry.

### Lock

Owner calls `lock_round`. Phase = Locked. Matching service computes per-pool pairings:
- Pool 0: pairs (Alice, Xavier), (Dave, Yolanda), etc.
- Pool 1: pairs (Bob, ...), etc.
- Pool 2: pairs (Carol, ...), etc.

### Settle

Owner calls `submit_match_result(Alice, Xavier, payoutA, payoutB, houseFee)` and so on for every pair. First call transitions Locked → Settling.

For Alice (`answer=7`, `guess=3`) vs Xavier (`answer=3`, `guess=7`):
- Alice guessed 3, Xavier answered 3 → ✓
- Xavier guessed 7, Alice answered 7 → ✓
- Outcome: **Split** (both correct). Since fee is 0 in DEMO_ROUND_CONFIG, each gets 1.0 stake (in STANDARD: 0.9S each).

Owner calls `settle_round` after all pairs done. Phase = Settled.

### God Mode

Alice reveals her answer was 7. Her commitment verifies. Public sees. Xavier reveals 3. Dave keeps his answer secret (opt-in mode).

### House fee claim

Owner calls `claim_house_fee`. Receives `houseFeeAccumulated` × 0.1. In DEMO_ROUND_CONFIG (fee = 0), no fee.

### Next round

Owner calls `new_round`. Phase = Forming. `roundId` increments. All state cleared. Bots re-seeded (client-side) for the next round.

---

## 12. Edge Cases

- **Entry to full pool**: rejected with "Assigned pool full - please retry". Player retries; counter may have advanced.
- **All pools hit max**: reject all further entries. Owner should lock.
- **Zero real players in a pool at lock time**: impossible by design (`poolsReadyCount >= poolCount` guard in `lock_round`).
- **Odd pool size**: last shuffled player in that pool is unpaired, gets full refund.
- **Same player tries to enter twice**: rejected with "Already entered".
- **Round expires with one pool under-minimum**: owner calls `abort_round`; every player (even those in overfilled pools) gets full refund.

---

## 13. Vocabulary Summary Card

```
┌────────────────────────────────────────────────────────────────────┐
│  CONCEPT       │  PRIVATE?  │  CAPPED?            │  WHERE STORED │
├────────────────────────────────────────────────────────────────────┤
│  answer        │  YES       │  NO                 │  Commitment   │
│  guess         │  NO        │  YES (per pool)     │  Plain ledger │
│  pool_id       │  UI-hidden │  Per-pool limits    │  Plain ledger │
│  salt          │  YES       │  N/A                │  Client only  │
│  house fee     │  NO        │  10% of each pot    │  Plain ledger │
└────────────────────────────────────────────────────────────────────┘
```

For the full rulebook, see [`RULES_MVP.md`](./RULES_MVP.md).
For architectural details, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
For honest blind-spot analysis, see [`WHAT_YOURE_NOT_THINKING_ABOUT.md`](./WHAT_YOURE_NOT_THINKING_ABOUT.md).
