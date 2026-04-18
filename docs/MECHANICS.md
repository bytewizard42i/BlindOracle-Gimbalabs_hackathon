# BlindOracle — Game Mechanics

**Authoritative reference for the BlindOracle ruleset.**
Read this first if you're implementing a client, writing integration tests, or analyzing the protocol.

---

## 1. Vocabulary (Critical — Do Not Conflate)

BlindOracle has exactly **two numbers** per player per round. They look similar. They are not.

### `answer` — the hidden target
- The number a player locks in **for OTHER players to try to guess**.
- **PRIVATE**. Stored on-chain only as a hiding commitment (persistentHash of [answer, salt]).
- **NEVER capacity-capped.** Every player can choose any answer in the valid range, because capping answers would reduce the population of potential winners.
- Revealed (optionally) only during the God Window phase, after settlement.

### `guess` — the player's prediction
- The number a player is **betting their opponent's answer will be**.
- **PUBLIC at commit time.** Stored directly on-chain as a plain `Uint<64>`.
- **CAPACITY-CAPPED.** At most `maxGuessesPerNumber` players may choose any single guess value.
- Why public? Because the cap is what it exists for. Enforcing a cap requires the chain to know the value. This is the "poker betting is public, cards are private" pattern.

If you ever find yourself writing "the player's secret guess" or "their hidden prediction" — **stop**. One is private (answer), the other public (guess). They are different concepts with different privacy treatments.

---

## 2. Round Lifecycle

Rounds progress through a strict state machine. Each transition is enforced on-chain.

```
     ┌──────────┐   entry brings count ≥ minPlayers   ┌──────────┐
     │ FORMING  │───────────────────────────────────▶│   OPEN   │
     │   (0)    │                                    │    (1)   │
     └────┬─────┘                                    └─────┬────┘
          │                                                │
          │ owner calls abort_round()                      │ owner calls lock_round()
          │ (entry window expired below minPlayers)        │
          ▼                                                ▼
     ┌──────────┐                                    ┌──────────┐
     │ ABORTED  │                                    │  LOCKED  │
     │   (5)    │                                    │    (2)   │
     └────┬─────┘                                    └─────┬────┘
          │                                                │
          │ every player calls claim_refund()              │ owner calls submit_match_result()
          │                                                │ (for each pair)
          ▼                                                ▼
     [refunds distributed]                           ┌──────────┐
                                                     │ SETTLING │
                                                     │    (3)   │
                                                     └─────┬────┘
                                                           │ owner calls settle_round()
                                                           ▼
                                                     ┌──────────┐
                                                     │ SETTLED  │
                                                     │    (4)   │
                                                     └─────┬────┘
                                                           │ owner calls new_round()
                                                           ▼
                                                     ┌──────────┐
                                                     │ FORMING  │  (next round)
                                                     │   (0)    │
                                                     └──────────┘
```

### Phase-by-phase

#### 0 — Forming
- Round is created; `playerCount < minPlayers`.
- Entries accepted via `enter_round`. Each entry:
  - Verifies the caller's identity
  - Checks the guess is in range
  - Checks the guess bucket has capacity
  - Records answer commitment + public guess
- The **moment** `playerCount` reaches `minPlayers`, the contract auto-advances to **Open**.

#### 1 — Open
- `playerCount ≥ minPlayers`. Entry window running (tracked off-chain by the owner).
- Entries still accepted until `maxPlayers` reached OR owner calls `lock_round`.
- UI should show "Round starts in T seconds" countdown.

#### 2 — Locked
- No more entries.
- Owner calls `submit_match_result` once per matched pair.
- First call transitions Locked → Settling.
- Unpaired players (odd count) get `submit_unpaired_refund`.

#### 3 — Settling
- Match results accumulating. Each pair's payouts are recorded.
- Once all pairs submitted, owner calls `settle_round`.

#### 4 — Settled
- All payouts finalized. Players can verify their outcomes.
- God Window opens (if enabled): players can call `reveal_for_god_window` with their `(answer, salt)` to publish the previously-hidden answer.
- Owner can start a new round via `new_round`.

#### 5 — Aborted
- Entry window expired with `playerCount < minPlayers`.
- Owner called `abort_round` instead of `lock_round`.
- Every participant calls `claim_refund` to recover their full stake (no protocol fee on aborts).
- Owner can start a new round via `new_round`.

---

## 3. The Anti-Crowd Cap

### Why?

Without a cap, a prediction game is vulnerable to **crowd collapse**: every rational player converges on the "best" number (maybe 7, maybe a round-specific Schelling point). This:
1. Wastes guesses — most become duplicates
2. Collapses game variance — outcomes become uniform
3. Discourages diversity — exactly what makes the game interesting

The anti-crowd cap **forces diversity** by making any single guess value a limited resource.

### How?

Each guess value has `maxGuessesPerNumber` "slots." Once those are filled, that number is **rejected** for new entries. The UI displays this in real time:

```
  Guess:  1  2  3  4  5  6  7  8  9 10
 Picked:  2  0  1  3  1  0 [3] 1  2  0     ← bucket 7 is FULL
```

When a player tries to commit a full guess, the circuit throws `Guess bucket full - pick a different number`.

### Ceiling effect

Max round capacity = `min(maxPlayers, range × maxGuessesPerNumber)`.
- Range 1-10, cap 3 → max 30 players (whichever comes first with `maxPlayers`).
- Range 1-20, cap 5 → max 100 players.

See `theoreticalMaxPlayers(config)` in `blindoracle-api/src/config.ts`.

---

## 4. The Minimum-Player Epoch

### Why?

A 1-player "round" has no game. A 2-player round has trivial dynamics. The minimum-player gate ensures every round has **real stakes and real strategic depth**.

### How?

- Round starts in `Forming` phase.
- Entries are accepted but the round is **not formally active**.
- When `playerCount` reaches `minPlayers`, the round auto-transitions to `Open` — and the entry window starts ticking.
- If the window expires **before** `minPlayers` is reached, the owner calls `abort_round`. Every player then calls `claim_refund` for a full, fee-free refund.

This is a **fairness guarantee**: nobody loses money just because the round failed to fill.

### UX implications

- "Round forming — 3 of 4 needed" (Forming)
- "Round open! Starts in 4:59." (Open)
- "Round aborted — refund available." (Aborted)

---

## 5. Identity & Authorization

Every circuit that modifies ledger state uses the Compact **public-key derivation pattern**:

```compact
const sk = local_secret_key();                          // witness
const caller_pk = persistentHash<Vector<2, Bytes<32>>>([
  pad(32, "midnight:pk:"),
  sk
]);
```

The derived `caller_pk` is compared to the expected identity:
- For `lock_round`, `abort_round`, `submit_match_result`, etc. → must equal `owner` (sealed ledger value).
- For `enter_round`, `claim_refund`, `reveal_for_god_window` → must equal the `player_pk` parameter.

This prevents impersonation: you cannot enter a round as someone else, and you cannot claim someone else's refund.

---

## 6. Scoring Rules

For a matched pair (A, B) with answers `aA`, `aB` and guesses `gA`, `gB`:

| `gA == aB`? | `gB == aA`? | Outcome | Payouts |
|---|---|---|---|
| ✓ | ✗ | A wins | A: `pot - fee`, B: `0` |
| ✗ | ✓ | B wins | A: `0`, B: `pot - fee` |
| ✓ | ✓ | Split | A: `(pot - fee)/2`, B: `(pot - fee)/2` |
| ✗ | ✗ | Draw (neither guessed) | A: `stake - fee/2`, B: `stake - fee/2` |

Where `pot = 2 × stakeAmount` and `fee = pot × protocolFeeBps / 10000`.

**Unpaired players** (when player count is odd): full stake refund, no fee.
**Aborted rounds**: full stake refund, no fee, no matches.

See `scoreMatch()` in `blindoracle-api/src/game-logic.ts`.

---

## 7. The God Window

Optional post-settlement reveal phase. Four modes (configured per-round):

- **Disabled** — answers stay hidden forever
- **OptIn** — each player chooses whether to reveal via `reveal_for_god_window`
- **FullReveal** — every player is expected to reveal (social incentive, not enforced on-chain)
- **Delayed** — reveal after a configurable time delay (sealed-envelope effect)

The reveal circuit verifies:
```compact
computed_commitment = persistentHash<Vector<2, Bytes<32>>>([
  (answer as Field) as Bytes<32>,
  salt
])
assert(computed_commitment == stored_commitment)
```

If the player's claimed `(answer, salt)` matches what they originally committed, the answer is written to `revealedAnswers` and becomes publicly visible.

**Salt requirement**: the salt is NOT stored on-chain. Players must save it locally (wallet/localStorage keyed by roundId) at commit time to reveal later.

---

## 8. Fairness Properties

### What the contract guarantees

- ✅ Every player's answer is hidden until they choose to reveal (or never)
- ✅ Every player's guess is publicly committed before matching
- ✅ Nobody can change their commitment after submitting
- ✅ Nobody can enter twice
- ✅ The anti-crowd cap is enforced (no bucket overflow)
- ✅ Payouts match the scoring rules
- ✅ Round won't "soft-lock" at low player counts (aborted + refunded cleanly)

### What the contract does NOT yet guarantee (see `WHAT_YOURE_NOT_THINKING_ABOUT.md`)

- ❌ Randomness for pairing is grinding-resistant (uses commitment-derived entropy — vulnerable to sophisticated grinding)
- ❌ Collusion prevention (two players coordinating in private)
- ❌ Sybil resistance (one person, many wallets)
- ❌ Automatic actual coin movement (currently the contract records payouts; an off-chain settlement service moves NIGHT)

---

## 9. Example Round

**Config**:
- range 1-10, `maxGuessesPerNumber=3`, `minPlayers=4`, `maxPlayers=30`, `stake=1 NIGHT`, `fee=2%`

**Turn-by-turn**:
1. Alice enters: `answer=7`, `guess=3`. Phase = Forming (1 player).
2. Bob enters: `answer=2`, `guess=7`. Phase = Forming (2 players).
3. Carol enters: `answer=7`, `guess=3`. Bucket "3" now has 2/3.
4. Dave enters: `answer=9`, `guess=3`. Bucket "3" now 3/3. Phase auto-transitions to **Open** (4 ≥ minPlayers).
5. Eve enters: `answer=5`, `guess=3`. ❌ **Rejected** — bucket "3" is full.
6. Eve enters: `answer=5`, `guess=8`. ✓ Accepted. (5 players.)
7. Entry window expires. Owner calls `lock_round`. Phase = Locked.
8. Owner pairs: [Alice,Bob], [Carol,Dave]. Eve is unpaired.
9. `submit_match_result(Alice, Bob, ...)`:
   - Alice guessed 3, Bob answered 2 → ✗
   - Bob guessed 7, Alice answered 7 → ✓
   - Outcome: B wins. Bob gets 1.96 NIGHT, Alice gets 0.
10. `submit_match_result(Carol, Dave, ...)`:
    - Carol guessed 3, Dave answered 9 → ✗
    - Dave guessed 3, Carol answered 7 → ✗
    - Outcome: Draw. Both refunded 0.99 NIGHT.
11. `submit_unpaired_refund(Eve)`: Eve gets 1 NIGHT back.
12. `settle_round`. Phase = Settled.
13. God Window opens. Bob and Dave reveal their answers for bragging rights. Alice, Carol, Eve stay private.

---

## 10. Constants & Edge Cases

- **Range `[guessMin, guessMax]` inclusive** on both ends.
- **Zero-stake rounds** are valid (hackathon/demo mode) — contract arithmetic handles 0 cleanly.
- **Single-player round** is impossible to formally start (minPlayers ≥ 2 always).
- **All buckets full before minPlayers**: round can still be aborted by owner; players refunded.
- **Same caller tries to enter twice**: rejected with "Already entered".
- **Player drops mid-round**: their stake stays in the pot; they just don't claim their payout (stays in the `payouts` map for their pk).

---

## 11. Future Mechanics (See FUTURE_FUNCTIONALITY.md)

Currently MVP. Post-hackathon roadmap includes:
- Ranged guesses ("my opponent picked 5-7")
- Multi-round tournaments with aggregated scoring
- Team play (squads share answers)
- AI-oracle narrator
- Spectator mode with betting
- Delayed reveal / sealed envelopes
- Staking tiers (bronze/silver/gold rounds)
