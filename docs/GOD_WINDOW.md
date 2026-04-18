# BlindOracle — God Window Design

## Definition

The **God Window** is a post-settlement reveal interface that optionally shows the true hidden values after the protocol has finalized matching and rewards.

It is the moment where secrecy ends and truth becomes visible — but only after fairness has already been guaranteed.

---

## Why It Matters

The God Window creates a **dramatic reveal moment** while preserving fairness during gameplay:

- During active play: full privacy, maximum suspense
- After settlement: controlled disclosure, maximum drama
- The two phases never overlap — privacy is never compromised during gameplay

This is the emotional climax of each round. The God Window transforms BlindOracle from "a game where you guess" into "a game where hidden truth is finally revealed."

---

## Modes

### Mode 1 — Disabled (Default)

- No post-settlement reveal
- Players receive only their personal outcome (win/lose/draw)
- Maximum privacy purity
- Best for: serious competitive play, wagering modes

### Mode 2 — Opt-In Per Player

- After settlement, each player can choose to reveal their own secret and guess
- Other players' data remains hidden unless they also opt in
- Creates interesting social dynamics (who reveals? who stays hidden?)
- Best for: social play, building trust

### Mode 3 — Full Reveal (Round Setting)

- After settlement, ALL secrets and guesses for ALL pairs are revealed
- Set by the round creator before the round opens
- Players know entering the round that full reveal will happen
- Best for: spectator mode, educational demos, hackathon presentations

### Mode 4 — Delayed Reveal

- Secrets are revealed automatically after a configurable delay (e.g., 24 hours post-settlement)
- Creates a "sealed envelope" effect
- Best for: tournaments, narrative-driven events

---

## UX Design

### Pre-Settlement

The God Window is **invisible**. No UI element hints at what the secrets might be. The interface emphasizes mystery:

- "Your secret is sealed"
- "Your guess is locked"
- "Awaiting oracle judgment..."

### Settlement Moment

The result screen shows:

- **Your outcome**: Win / Lose / Draw
- **Your guess** vs **what was needed** (if mode allows)
- **Proof receipt** link
- **God Window button** (if enabled for this round)

### God Window View

When opened:

```
┌──────────────────────────────────────────┐
│          GOD WINDOW — Round #42          │
│                                          │
│  Match 1:  Alice vs Bob                  │
│  Alice's secret: 7    Bob's guess: 7 ✓   │
│  Bob's secret: 3      Alice's guess: 5 ✗  │
│  → Alice wins                            │
│                                          │
│  Match 2:  Carol vs Dave                 │
│  Carol's secret: 9    Dave's guess: 2 ✗   │
│  Dave's secret: 4     Carol's guess: 4 ✓  │
│  → Carol wins                            │
│                                          │
│  Match 3:  Eve vs Frank                  │
│  Eve's secret: 1      Frank's guess: 1 ✓  │
│  Frank's secret: 6    Eve's guess: 6 ✓    │
│  → Split                                 │
└──────────────────────────────────────────┘
```

### Visual Design

- Dark background with slow-reveal animations
- Numbers appear one at a time with dramatic timing
- Checkmarks and crosses animate in
- Winner highlight glow effect
- Optional sound design: low bass hit on reveal, triumphant tone on win

---

## Technical Implementation

### On-Chain

The God Window uses a separate circuit:

```compact
export circuit reveal_for_god_window(
  round_id: Field,
  player_pk: Bytes<32>,
  secret: Field,
  guess: Field,
  salt: Bytes<32>
): [] {
  // Verify round is settled
  assert(disclose(round_state == 3), "Round not settled");

  // Verify the revealed secret matches the original commitment
  const expected_commit = persistentCommit(secret);
  assert(disclose(expected_commit == stored_commitment), "Secret mismatch");

  // Verify the revealed guess matches the original guess commitment
  const expected_guess_commit = persistentCommit(guess);
  assert(disclose(expected_guess_commit == stored_guess), "Guess mismatch");

  // Store revealed values on ledger (now public)
  revealed_secrets.insert(player_pk, (secret as Field) as Bytes<32>);
  revealed_guesses.insert(player_pk, (guess as Field) as Bytes<32>);
}
```

### Off-Chain

The UI fetches revealed data from the indexer and animates the display. If a player hasn't revealed, their slot shows "Unrevealed" with a lock icon.

---

## Privacy Considerations

- The God Window is **strictly post-settlement** — it cannot be triggered during active play
- In Opt-In mode, revealing is voluntary — no player is forced to disclose
- In Full Reveal mode, players are warned before entering the round
- The reveal proves the disclosed values match the original commitments — no fake reveals possible
- Even in Full Reveal mode, only the secrets and guesses are shown — wallet balances, transaction details, and other private data remain hidden

---

## Spectator Integration

The God Window is the foundation for a future **Spectator Mode**:

- Spectators join a round as observers (no stake, no commitment)
- During active play, spectators see only: player count, countdown timer, match assignments after lock
- After settlement, spectators see the God Window automatically
- Spectators can react, comment, or share replays

This creates a **streaming-friendly** experience — the reveal moment is inherently entertaining content.

---

## Design Principles

1. **Privacy during play is sacred** — the God Window never leaks information early
2. **Consent-based disclosure** — players choose to reveal (in opt-in mode)
3. **Drama is a feature** — the timing and animation of reveals matter
4. **Truth is verifiable** — revealed values are proven to match commitments
5. **The God Window is optional** — it enhances but is not required
