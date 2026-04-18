# BlindOracle — MVP Game Rules

**Version**: 0.1.0 (Hackathon MVP)

---

## Overview

BlindOracle is a round-based prediction game where players commit to a hidden secret number, submit a blind guess, and are randomly paired after the round closes. Winners are determined by whether their guess matches their opponent's secret.

**Core principle**: Fairness without full visibility. Players trust the outcome because it is cryptographically provable, not because everything is publicly visible.

---

## Round Structure

Each round has four phases:

### Phase 1 — Entry (Open)

- A round opens with a defined **entry window** (e.g., 5 minutes or until N players join)
- Each player connects their wallet and enters the round
- Entry requires a **stake** (fixed amount per round, identical for all players)

### Phase 2 — Commit (Secret + Guess)

During the entry window, each player submits two values:

1. **Secret Number**: A hidden value from **1 to 10** (inclusive)
2. **Guess**: A prediction of what their future opponent's secret might be, from **1 to 10**

Both values are committed on-chain as cryptographic commitments (hashes). The raw values are **never** publicly visible during this phase.

- Players cannot see other players' secrets or guesses
- Players cannot change their submission after committing
- The commitment proves the value was chosen before matching

### Phase 3 — Lock + Match

Once the entry window closes:

- **No more entries or changes** are accepted
- The protocol **randomly pairs** players into 1-on-1 matches
- If there is an odd number of players, the unpaired player receives a **refund** (no penalty)
- Pairing is deterministic from the set of locked entries + an entropy source, making it auditable

### Phase 4 — Settle + Prove

For each pair:

| Scenario | Outcome |
|----------|---------|
| Player A's guess == Player B's secret | **A wins the match** |
| Player B's guess == Player A's secret | **B wins the match** |
| Both guess correctly | **Split** — each receives their stake back |
| Neither guesses correctly | **Draw** — each receives their stake back minus a small protocol fee |

**Payout**: The winner receives both players' stakes minus the protocol fee.

Each player receives a **proof of outcome** — a verifiable receipt showing the result without exposing all private data from the round.

---

## God Window (Optional)

After settlement, the round host or protocol can enable the **God Window**:

- Reveals the actual secret numbers and guesses for all pairs
- Creates a dramatic reveal moment
- Useful for spectators, replays, and educational demos
- **Disabled by default** — must be explicitly enabled per round or mode

The God Window does **not** affect settlement. It is purely a post-settlement disclosure feature.

---

## Parameters (MVP Defaults)

| Parameter | Default |
|-----------|---------|
| Secret range | 1–10 |
| Guess range | 1–10 |
| Min players per round | 2 |
| Max players per round | 20 |
| Entry window | 5 minutes |
| Stake per player | Fixed (TBD — configurable) |
| Protocol fee | 2% of total pot |
| God Window | Off (opt-in) |

---

## Anti-Cheat Properties

- **Non-malleable commitments**: Secrets and guesses are locked via `persistentCommit` before matching occurs
- **Post-lock pairing**: No player knows their opponent when choosing their secret or guess
- **Auditable randomness**: Pairing entropy is derived from committed data, making it deterministic and verifiable
- **No information leakage**: The protocol reveals only the outcome, not the full private state (unless God Window is enabled)

---

## Winning Strategy

In the MVP, the optimal strategy depends on game theory:

- **Pure luck**: If opponents choose uniformly random, all guesses are equally likely to succeed (10% hit rate per pair)
- **Behavioral reads**: Over many rounds, patterns may emerge — but the MVP does not provide opponent history
- **Risk tolerance**: Entering the round is the primary decision — the guess itself is low-information

Future versions may add strategic depth through multi-round history, partial reveals, and advanced scoring.

---

## Example Round

1. **6 players** enter Round #1
2. Each commits a secret number and a guess
3. Entry window closes → all commitments lock
4. Protocol pairs: A↔D, B↔F, C↔E
5. Results:
   - A guessed 7, D's secret was 7 → **A wins**
   - D guessed 3, A's secret was 5 → **D loses**
   - B guessed 4, F's secret was 9 → **B loses**
   - F guessed 2, B's secret was 2 → **F wins**
   - C guessed 6, E's secret was 6 → **C wins**
   - E guessed 1, C's secret was 8 → **E loses**
6. Payouts distributed, proof receipts issued
7. God Window (if enabled): all secrets and guesses revealed for spectators
