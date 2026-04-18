# BlindOracle — MVP Rules

**TL;DR**: Pick a secret number. Guess what your random opponent's secret is. Oracle judges. Winner takes pot (minus 2% fee). Optional reveal afterward.

For the detailed state machine and mechanics, see [`MECHANICS.md`](./MECHANICS.md).
For the full ruleset in tabular form, see [`../blindoracle-api/src/config.ts`](../blindoracle-api/src/config.ts).

---

## 1. Core Concepts

Every player commits **two numbers**:

| Concept | Meaning | Privacy | Capacity |
|---------|---------|---------|----------|
| `answer` | The number OTHERS will try to guess. YOUR secret. | **Private** (hidden commitment) | Uncapped |
| `guess` | What YOU think your opponent's answer is. Your prediction. | **Public** at commit | Capped |

This distinction is the protocol's foundation. Read [`MECHANICS.md §1`](./MECHANICS.md#1-vocabulary--critical--do-not-conflate) if unclear.

---

## 2. Round Phases

```
 Forming → Open → Locked → Settling → Settled
               ↓
             Aborted (if not enough players)
```

| Phase | What happens |
|-------|-------------|
| **Forming** | Entries accepted. Round hasn't formally started (below min players). |
| **Open** | Minimum met, entry window counting down. Still accepting entries. |
| **Locked** | No more entries. Matching begins. |
| **Settling** | Pair-by-pair settlement. |
| **Settled** | All payouts assigned. God Window opens. |
| **Aborted** | Too few players. Refunds claimable. |

---

## 3. The Entry Phase

When you click "Enter Round":
1. Your browser picks a 32-byte random salt.
2. The UI computes `persistentHash(answer, salt)` — the hiding commitment.
3. You submit `(player_pk, answer_commitment, guess)` to the contract via `enter_round`.
4. The contract verifies:
   - Round is Forming or Open
   - You haven't entered yet
   - Your guess is in range
   - **Your guess bucket isn't full** ← anti-crowd cap
   - Round isn't at max players
5. The contract writes your entry and increments the bucket count.
6. If your entry brings the player count to `minPlayers`, the round auto-transitions to Open.

---

## 4. The Anti-Crowd Cap

> *"We never want to lock in the number the player chose for themselves — that would limit potential winners. But we DO want to prevent everyone from piling on the same guess."*
> — John

**How it works**: Each guess value has `maxGuessesPerNumber` slots. Once those are filled, that number is rejected for new entries.

**Example** (range 1-10, cap 3):
```
  Guess:  1  2  3  4  5  6  7  8  9 10
 Picked:  1  0  2  0  3  1  2  0  1  0
                       ↑
                   bucket 5 is full — no new entries on 5
```

Try to pick a full bucket → `Guess bucket full - pick a different number`. The UI grays out full numbers.

**Why cap guesses but not answers?**
- Capping answers would reduce the population of potential winners (fewer unique targets).
- Capping guesses forces strategic diversity without sacrificing win-rate.
- Secret info (answer) stays secret → game integrity.

---

## 5. The Minimum-Player Epoch Gate

> *"An epoch in our game doesn't start until there are enough players. There may need to be a refund mechanism."*
> — John

**Before minPlayers reached** (Forming):
- Entries accepted but round is "warming up"
- Entry window has NOT started
- Owner can call `abort_round` if confidence is low

**When minPlayers reached**:
- Round auto-transitions to Open
- Entry window begins
- More entries welcome up to `maxPlayers`

**If entry window expires below minPlayers** (off-chain timer):
- Owner calls `abort_round` → phase = Aborted
- Every player calls `claim_refund` → gets full stake back, no fee
- Owner calls `new_round` to reset

This guarantees: **nobody ever loses money to a failed round**.

---

## 6. The Lock Phase

When the entry window expires with enough players:
- Owner calls `lock_round` → phase = Locked
- No more entries accepted
- Off-chain matching service computes pairs using deterministic randomness seeded from all commitments

---

## 7. The Matching Phase

Matching uses a deterministic shuffle seeded from the set of locked commitments. Properties:
- **Reproducible** by any verifier
- **Unpredictable** until lock (nobody knew who their opponent would be)
- **Unmanipulable** by any single player (all commitments feed the seed)

For odd player counts, the last player after shuffle is unpaired and gets a full stake refund.

**Note on randomness**: the MVP entropy source is commitment-derived, which is theoretically grindable. Production should use a Midnight block-hash beacon. See [`WHAT_YOURE_NOT_THINKING_ABOUT.md §Solution 1`](./WHAT_YOURE_NOT_THINKING_ABOUT.md#problem-1-randomness-grinding-attack).

---

## 8. The Settlement Phase

For each matched pair `(A, B)`:

```
pot = 2 × stakeAmount
fee = pot × protocolFeeBps / 10000

if A guessed B's answer AND B guessed A's answer:
  → Split: both get (pot - fee) / 2
elif A guessed B's answer (only):
  → A wins: A gets pot - fee, B gets 0
elif B guessed A's answer (only):
  → B wins: B gets pot - fee, A gets 0
else:
  → Draw: both get stakeAmount - fee/2
```

Owner calls `submit_match_result(a, b, payoutA, payoutB)` once per pair. First call transitions Locked → Settling.

---

## 9. The God Window

After `settle_round`, if the God Window is enabled for this round:
- Each player may call `reveal_for_god_window(pk, answer, salt)`.
- The contract recomputes the commitment and verifies it matches.
- If valid, the answer is written to `revealedAnswers` and becomes publicly visible.

Four God Window modes (per-round config):

| Mode | Behavior |
|------|----------|
| `Disabled` | No reveal. Answers stay secret forever. |
| `OptIn` | Each player chooses whether to reveal. |
| `FullReveal` | All players are socially expected to reveal (not contract-enforced). |
| `Delayed` | Reveals happen automatically after a delay (sealed-envelope effect). |

---

## 10. Anti-Cheat Properties Summary

- ✅ **Hiding**: commitments reveal nothing about answers
- ✅ **Binding**: you cannot swap your answer after committing
- ✅ **No double-entry**: one pk = one entry per round
- ✅ **Range-bounded**: all answers and guesses must be in `[guessMin, guessMax]`
- ✅ **Authorization**: `owner`-only circuits verify caller identity via pk derivation
- ✅ **Idempotent refunds**: `claim_refund` cannot be called twice by the same player
- ✅ **Auditable settlement**: every payout is on-chain and verifiable
- ✅ **Anti-crowd enforcement**: guess bucket counts prevent pile-ups
- ✅ **Min-player guarantee**: refunds preserved on under-filled rounds

---

## 11. MVP Parameters (Demo Config)

See [`../blindoracle-api/src/config.ts`](../blindoracle-api/src/config.ts) for the authoritative values.

```ts
DEMO_ROUND_CONFIG = {
  stakeAmount: 0,             // free-play (no gambling concerns)
  minPlayers: 2,
  maxPlayers: 30,
  maxGuessesPerNumber: 3,
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 0,
  godWindow: 'full-reveal',
  entryWindowSeconds: 120,
}
```

Max round capacity: `min(30, 10 * 3) = 30` players.

---

## 12. Winning Strategy (Such As It Is)

For a 10-number MVP, each guess has ~10% baseline hit rate. Over many rounds:
- **Pure-random play**: expected value ≈ -protocolFeeBps/10000 of your stake per round.
- **Pattern play**: if some numbers become more common, either in answers or in guesses, you can attempt to counter-pick.
- **Streak play**: correctly guessing 3 rounds in a row is 0.1% probability — small edge from statistical wins on streak-bonus modes (future).

The game is **barely skill** in MVP form. That's both a feature (low barrier) and a compliance concern (see [`GAMBLING_COMPLIANCE.md`](./GAMBLING_COMPLIANCE.md)).

Future versions will add skill elements: ranged guesses, multi-round tournaments, history-aware strategies.
