# BlindOracle — God Mode

> *"The oracle knows. You did not. Now you may see."*

**Status**: Implemented in contract as `reveal_for_god_mode`. UI implementation pending.

---

## 1. What Is God Mode?

God Mode is the optional **post-settlement phase** where players can reveal their original answers. It's the emotional climax of a round — the moment when hidden information becomes visible, but **only after** fairness has been cryptographically guaranteed.

### The narrative arc

1. **Forming** — you whisper a number into the dark
2. **Open** — others whisper their numbers; you all guess each other
3. **Locked** — the door closes; fate is sealed
4. **Settled** — the oracle judges; payouts flow
5. **God Mode** — *the veil lifts*

This is not a privacy compromise. It's the **end** of privacy for players who choose it.

---

## 2. Why Is It Important?

### Narrative payoff
Without a reveal, the game feels abstract. Players enter numbers, see payouts, move on. With God Mode, there's a dramatic "aha" — you see what your opponent was hiding, what you almost got, what they were thinking.

### Trust-building
Every reveal is cryptographically verified via the commitment preimage. Players can confirm the contract didn't cheat: the revealed number MATCHES the commitment they saw earlier. This is **social proof via math**.

### Skill signal
A player's revealed answer tells the community something about their strategy. Over many rounds, patterns emerge — "Bob always picks 7", "Alice never picks edge numbers." This builds social capital and meta-game depth.

### Highlight reel
Good reveals make great streaming content. Near-misses, bold plays, shocking coincidences — all fodder for OBS overlays, Discord clips, Twitter GIFs.

---

## 3. Four Modes

Configured per-round via `RoundConfig.godMode`:

### `Disabled` — pure privacy forever
No reveals ever. Answers stay secret. Best for:
- Tournament play where strategic info has long-term value
- High-stakes rounds where revealing is risky
- Players who prefer the mystery

### `OptIn` — each player chooses (default for Standard)
Each player calls `reveal_for_god_mode` if they want; others stay hidden. Best for:
- Casual play where some players want drama, some don't
- Mixed social groups
- Preserving individual agency

### `FullReveal` — all revealed (default for Demo)
Socially expected that everyone reveals. Not strictly enforced on-chain (players can refuse). Best for:
- Demos and showcases
- Community events
- Hackathon presentations

### `Delayed` — automatic reveal after time
Reveals happen automatically after a configurable delay. Creates a sealed-envelope effect. Best for:
- High-suspense moments
- Tournament final rounds
- Content-creation formats

---

## 4. How The Reveal Works

### Client-side

1. At entry time, the UI generates a random 32-byte salt
2. UI stores salt in localStorage: `localStorage['blindoracle_salt_' + roundId + '_' + playerPk] = saltHex`
3. Post-settlement, UI retrieves salt when player clicks "Reveal"

### On-chain

```compact
export circuit reveal_for_god_mode(
  player_pk: Bytes<32>,
  answer: Uint<64>,
  salt: Bytes<32>
): [] {
  // Must be settled phase
  assert(disclose(roundPhase == 4), "Round not settled");

  // Must be a participant
  assert(disclose(answerCommitments.member(pk)), "No commitment found");

  // Caller must be the player themselves
  assert(disclose(caller_pk == player_pk), "Caller pk mismatch");

  // Recompute commitment and verify
  const answer_bytes = (answer as Field) as Bytes<32>;
  const computed = persistentHash([answer_bytes, salt]);
  const stored = answerCommitments.lookup(pk);
  assert(disclose(computed == stored), "Commitment mismatch");

  // Write revealed answer to public ledger
  revealedAnswers.insert(pk, disclose(answer));
}
```

### Why this is trustless

The contract doesn't trust the player's word. It RECOMPUTES the commitment from the claimed `(answer, salt)` and verifies it matches the one stored at commit time. If a player tries to reveal a fake answer, the assertion fails and the tx reverts.

---

## 5. UX Design

### During settlement
- "Round settled! Revealing in 30 seconds..." (for Delayed mode)
- "Want to reveal your answer?" (for OptIn mode)
- "All players will reveal in 10 seconds..." (for FullReveal mode)

### The reveal animation
- Black screen
- Numbers appear slowly, one at a time, with a low bass pulse
- Each player's revealed answer fades in next to their pk (truncated)
- If they were paired with someone who also revealed, the pair is highlighted
- "Alice's answer: 7. Bob's guess: 3. Near miss — off by 4."

### After the reveal
- **Streaming overlay ready** layout: big numbers, clean background
- Shareable image export: "My BlindOracle Round #42: I guessed 3, they had 7. So close."
- Archive in your player history (local + optional on-chain via DIDz credential)

---

## 6. Technical Implementation

### Salt management

**Problem**: salt must persist from entry to reveal. Browser localStorage is fragile.

**Solution tiers**:
1. **MVP**: localStorage (acceptable for hackathon)
2. **v1**: Lace wallet-integrated encrypted storage
3. **v2**: DIDz-based social recovery (guardian-assisted salt recovery)

**If salt is lost**: player cannot reveal. Their answer stays hidden forever. The UI warns clearly at entry time: "Save your recovery phrase to prevent loss."

### On-chain storage efficiency

Each revealed answer costs ~32 bytes (a Uint<64> value + key). For a 30-player round with full reveal, that's ~1KB of ledger data. Negligible.

### Verification cost

The reveal circuit runs `persistentHash` once and compares. ZK proof generation for this circuit is light (~1-2 seconds client-side). No concerns.

---

## 7. Privacy Considerations

### God Mode is OPT-IN (except FullReveal config)

Players who value privacy can refuse to reveal. Their answer stays secret forever. The contract doesn't coerce.

### Once revealed, permanent

A revealed answer is written to `revealedAnswers`. It's on-chain public data forever. This is a one-way door.

### Salt loss = de facto privacy

If a player loses their salt, they literally cannot reveal even if they wanted to. This is a *feature*, not a bug — it's an escape hatch for players who want mandatory privacy.

### Correlation attacks

Over many rounds with opt-in reveals, a sophisticated observer could build a profile of a player's "revealing habits" — maybe they always reveal wins, never losses. This leaks some strategy info but doesn't break core privacy.

---

## 8. Spectator & Content Integration

### Streaming layouts
Pre-designed OBS layouts for streamers:
- Game view with pool status
- Post-settlement reveal sequence
- Player leaderboard

### Discord bot
`/blindoracle round 42` → posts a summary with revealed answers, pairings, outcomes. Auto-posts after every round in subscribed channels.

### Twitter auto-post
Opt-in: "My round #42 result → https://blindoracle.io/r/42/me" with auto-generated share image.

### Leaderboard integration
Public record of revealed answers can power:
- Top-10 guessers (highest hit rate)
- Most-revealed (opt-in transparency kings)
- Near-miss hall of fame (always within 1, never exactly right)

---

## 9. Design Principles

1. **Drama > Information** — reveals should feel like a climax, not a data dump
2. **Opt-in by default** — never coerce revealing (except explicit FullReveal rounds)
3. **Cryptographic integrity** — every reveal is contract-verified
4. **Shareable moments** — UI optimized for content creation
5. **Reversal-proof** — once revealed, always revealed (no "undo")

---

## 10. Future God Mode Features

### Weighted reveals (reward mechanic)
Players who reveal first get a small bonus (XP, cosmetic unlocks). Encourages dramatic reveals in OptIn mode.

### Partial reveals
Reveal only a hint: "My answer was between 5 and 8." ZK proof of range without revealing exact.

### Batched reveal event
A ritualized "reveal hour" where all opt-in players reveal simultaneously. Very streamable.

### Cross-round reveal patterns
Track a player's reveal history. "Alice has revealed 12 rounds, always showing an answer above 5." Pattern visibility without forcing reveals.

### Tournament finale reveal
In tournament mode, final round forces all participants to reveal for the bracket replay. Creates dramatic tournament-end moments.

---

## 11. Related Documents

- [`MECHANICS.md §9`](./MECHANICS.md#9-god-mode-post-settlement-reveal) — the exact contract behavior
- [`RULES_MVP.md §9`](./RULES_MVP.md#9-god-mode-post-settlement-reveal) — player-facing rules
- [`ARCHITECTURE.md §7`](./ARCHITECTURE.md#7-privacy-architecture) — privacy model
- [`WHAT_YOURE_NOT_THINKING_ABOUT.md`](./WHAT_YOURE_NOT_THINKING_ABOUT.md) — salt recovery concerns
