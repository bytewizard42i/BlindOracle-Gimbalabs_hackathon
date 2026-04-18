# BlindOracle — MVP Rules (v3, Pooled)

**TL;DR**: Pick a secret answer. Predict your random opponent's answer. You're invisibly assigned to one of 3 pools (fed by bots to feel active). When all pools have enough real players, the game starts. Winners split 90%; house takes 10%. Optional God Mode reveal after.

For detailed mechanics → [`MECHANICS.md`](./MECHANICS.md).
For architecture → [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 1. Core Concepts

| Concept | Meaning | Privacy | Capacity |
|---------|---------|---------|----------|
| `answer` | The number OTHERS will try to guess. YOUR secret. | **Private** (committed) | Uncapped |
| `guess` | What YOU think your opponent's answer is. Your prediction. | **Public** at commit | Capped per pool |
| `pool` | One of 3 invisible groups you're assigned to. | UI-hidden | Per-pool min + max |
| `bots` | UI fiction that makes pools look active during Forming. | N/A | Off-chain only |

---

## 2. The Three Pools

At round creation, the contract is configured with **3 pools** (admin-tunable). Each pool:
- Starts visually pre-populated with `poolBotSeedCount` bot entries (UI fiction)
- Accepts real players up to `poolMaxRealPlayers`
- Becomes "ready" when it has `poolMinRealPlayers` real players
- Runs its own independent matching at settlement

The player is **assigned to a pool automatically** via a round-robin counter. The UI never displays which pool you're in. This obfuscation is intentional — it prevents collusion and strategic pool-targeting.

---

## 3. Round Phases

```
 Forming → Open → Locked → Settling → Settled
       ↓
     Aborted (if not enough players per pool)
```

| Phase | What's happening |
|-------|-------------------|
| **Forming** | Entries accepted. Round hasn't formally started (one or more pools below min). |
| **Open** | All pools have hit min. Entry window running. Still accepting more up to max. |
| **Locked** | No more entries. Matching begins. |
| **Settling** | Pair-by-pair settlement within each pool. |
| **Settled** | All payouts assigned. House fee claimable. God Mode opens. |
| **Aborted** | Entry window expired with a pool under min. Refunds claimable. |

---

## 4. The Entry Flow

When you click "Enter Round":
1. Your browser picks a 32-byte random salt.
2. UI computes `persistentHash([answer_bytes, salt])` — the hiding commitment.
3. UI submits `(player_pk, answer_commitment, guess)` to `enter_round`.
4. Contract verifies:
   - Round is Forming or Open
   - You haven't entered yet
   - Guess is in range
   - **The pool you're assigned to isn't full**
   - **The (pool, guess) bucket isn't full** ← per-pool anti-crowd cap
5. Contract records your entry, assigns your pool (invisibly), increments the bucket counter.
6. If your entry makes any pool reach `poolMinRealPlayers`, that pool is marked ready.
7. If ALL pools are now ready, the round auto-transitions Forming → Open.

---

## 5. The Anti-Crowd Cap (Per-Pool)

> *"We never want to lock in the number the player chose for themselves — that would limit potential winners. But we DO want to prevent everyone from piling on the same guess."*
> — John

Each `(pool, guess)` combo has `maxGuessesPerNumber` slots. Once full, that number is rejected in that pool.

**Example** — range 1-10, cap 2 per pool, 3 pools:

| Pool | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 1 | **2** | 0 | 1 | 0 | 0 | 2 | 1 | 0 |
| 1 | 1 | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 1 | 0 |
| 2 | 0 | 0 | 1 | 0 | **2** | 0 | 2 | 1 | 0 | 0 |

Bold = full. The UI shows **aggregated** availability across pools since the player doesn't know their pool:
- Number 3 → 1 slot available (across all pools)
- Number 5 → 4 slots available
- Number 7 → 3 slots available

If you pick a number whose pool-specific bucket is full for YOUR assigned pool, the entry is rejected with "Guess bucket full in this pool — pick another number." Retry with a different number.

---

## 6. The Minimum-Player Epoch Gate

> *"An epoch in our game doesn't start until there are enough players per pool. There may need to be a refund mechanism."*

**Before any pool reaches min** → Forming phase. Entry window hasn't started.

**All pools reach min** → auto-transition to Open. Entry window running. Round is "live" but still accepting entries.

**Entry window expires with any pool still below min** → owner calls `abort_round`. Every player in every pool gets full refund via `claim_refund`.

This guarantees **nobody loses money to a failed round**. Even if pool 0 is full but pool 2 never fills, everyone in pool 0 is refunded fully.

---

## 7. Lock → Match → Settle

### Lock
Owner calls `lock_round` after entry window expires (or pools are at max). Contract verifies all pools still at or above min. Transitions to Locked.

### Match
Off-chain matching service groups players by pool, then shuffles each pool independently using deterministic entropy. Pairs players within the same pool only.

Odd pool sizes: the last player is unpaired and gets a full refund via `submit_unpaired_refund`.

### Settle
Owner calls `submit_match_result(A, B, payoutA, payoutB, houseFee)` once per pair. Contract verifies:
- A and B are both in the round
- A and B are in the **same pool**
- Neither has already been settled

First `submit_match_result` call transitions Locked → Settling. After all pairs + unpaired players submitted, owner calls `settle_round` → Settled.

---

## 8. The 90/10 Split

> *"90% of the proceeds are split and disbursed, ZK proofs are sent to verify fair game play, and the house (owner of the game) gets 10% of the pot."*

For each matched pair with stake `S`:

```
pot       = 2 × S
houseFee  = pot × 1000 / 10000  = 10% of pot
winnersPool = pot - houseFee    = 90% of pot = 1.8 × S
```

### Payout matrix

| A guessed B? | B guessed A? | Outcome | A's payout | B's payout |
|---|---|---|---|---|
| ✓ | ✗ | A wins | 1.8S | 0 |
| ✗ | ✓ | B wins | 0 | 1.8S |
| ✓ | ✓ | Split | 0.9S | 0.9S |
| ✗ | ✗ | Draw | 0.95S | 0.95S |

### House fee flow

Each `submit_match_result` adds the pair's `houseFee` to the on-chain `houseFeeAccumulated` counter. After settlement, the owner calls `claim_house_fee()` to zero the counter; the off-chain settlement service moves the actual NIGHT to the owner's wallet.

---

## 9. God Mode (Post-Settlement Reveal)

> *"There may be a mechanism for the actual number that they were playing against in a 'God mode'."*

After `settle_round`, if God Mode is enabled:
- Any player may call `reveal_for_god_mode(pk, answer, salt)`
- Contract recomputes `persistentHash([answer, salt])` and verifies it matches the stored commitment
- If valid, the answer is written to `revealedAnswers` and becomes public

Players can now see what their opponent was playing. **The dramatic climax.**

### God Mode modes

| Mode | Behavior |
|------|----------|
| `Disabled` | No reveal. Answers stay secret forever. |
| `OptIn` | Each player chooses whether to reveal (default for Standard rounds). |
| `FullReveal` | All players expected to reveal (default for Demo rounds). |
| `Delayed` | Automatic reveal after a time delay (future feature). |

### Salt requirement

Your salt is **NOT stored on-chain**. The UI saves it in localStorage keyed by `roundId` when you commit. Lose your browser storage → lose the ability to reveal.

---

## 10. Anti-Cheat Properties Summary

- ✅ **Hiding**: commitments reveal nothing about answers
- ✅ **Binding**: you cannot swap your answer after committing
- ✅ **Identity-verified**: every player circuit checks derived pk matches declared pk
- ✅ **No double-entry**: one pk = one entry per round
- ✅ **Range-bounded**: all guesses must be in `[guessMin, guessMax]`
- ✅ **Same-pool matching**: `submit_match_result` verifies both players are in the same pool
- ✅ **Idempotent refunds + settlement**: prevents double-claim and double-settlement
- ✅ **Auditable house fee**: `houseFeeAccumulated` is public; owner can't over-claim
- ✅ **Per-pool anti-crowd**: cap enforced at entry time
- ✅ **Min-player guarantee**: refunds preserved on under-filled rounds
- ✅ **All state transitions ZK-proven**: Midnight's default property

---

## 11. MVP Parameters (Demo Config)

See [`../blindoracle-api/src/config.ts`](../blindoracle-api/src/config.ts) for authoritative values.

```ts
DEMO_ROUND_CONFIG = {
  stakeAmount: 0,                    // free-play demo (no gambling concerns)
  poolCount: 3,
  poolMinRealPlayers: 4,             // 12 real players minimum total
  poolMaxRealPlayers: 8,             // 24 real players max total
  poolBotSeedCount: 6,               // 6 bots per pool in UI (18 total fiction)
  maxGuessesPerNumber: 2,            // per pool
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 0,                 // 0% for demo; STANDARD uses 1000 (10%)
  godMode: 'full-reveal',
  entryWindowSeconds: 120,
}
```

Theoretical max: `3 pools × min(8 max, 10 × 2 cap) = 24` real players.

---

## 12. Winning Strategy (MVP)

With range 1-10 and random opponent, baseline hit rate is ~10%. The anti-crowd cap per pool adds a meta-game:
- Popular numbers fill up first; you can't always pick 7
- You can infer which numbers others might pick based on aggregated availability

Over many rounds, **purely random play** has expected value:
```
EV per match = 0.1 × (1.8S) + 0.1 × (0.9S)   # win + split probability roughly
             - 0.8 × (S)                      # lose probability
            ≈ -0.61S per match
```

Wait, that's aggressive. Let me recompute:
- P(A wins) = P(guess = opponent's answer) × P(opponent didn't guess A's answer) = 0.1 × 0.9 = 0.09
- P(B wins) = symmetric = 0.09
- P(split) = 0.1 × 0.1 = 0.01
- P(draw) = 0.9 × 0.9 = 0.81

EV(A) = 0.09 × 1.8S + 0.01 × 0.9S + 0.81 × 0.95S - 0.09 × 0 - stake_paid
      = 0.162 + 0.009 + 0.7695 - S
      ≈ 0.9405S - S = -0.0595S per match

So **pure random play loses ~6% per round** (almost exactly the house fee share). Expected. The skill element comes from pattern recognition and understanding other players' psychology over many rounds.

Future versions will add higher-skill modes: ranged guesses, history-aware strategies, tournament formats with aggregated scoring. See [`../FUTURE_FUNCTIONALITY.md`](../FUTURE_FUNCTIONALITY.md).
