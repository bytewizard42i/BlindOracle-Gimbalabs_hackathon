# BlindOracle — What You're Not Thinking About

**Written by**: Penny 🎀
**For**: John
**Purpose**: Adversarial review of the project brief. Gaps, risks, and open questions worth addressing before committing to a full build.

This is the "devil's advocate" doc. Read it, dismiss what isn't relevant, use the rest.

---

## 1. Cryptographic & Protocol Gaps

### 🔴 Randomness source for fair pairing — NOT YET SOLVED

**The brief says**: "deterministic pairing from locked entries + entropy source."

**The real problem**: deriving entropy purely from commitments is vulnerable to **grinding attacks** — a sophisticated player with access to rapid re-commitment could bias their assignment. This is a known issue in commit-reveal schemes.

**What's needed**:
- A proper **VRF (Verifiable Random Function)** provided by a neutral party, OR
- A **commit-reveal for randomness itself** — each player commits a random seed during the entry phase, all seeds are XOR'd after lock, AND the last player to commit has NO influence because their commitment happens before the seed is revealed, OR
- A **beacon-based source** — use Midnight block hash at the lock block as seed (adversary would need to control block production to bias)

**Recommended**: Midnight block-hash beacon for MVP; evaluate VRF integration for v1.

### 🟡 Commitment malleability

Standard `persistentCommit` uses a fixed hash. Without a **nonce/salt**, two players committing the same value produce the same commitment — potentially leaking information about repeated secrets across rounds.

**Fix**: include a random salt in the commitment: `persistentCommit([value, salt])`. Store salt locally; reveal both at God Window time.

### 🟡 Player drop-out mid-round

What happens when a player:
- Commits the secret but drops before committing the guess?
- Commits both but the wallet goes offline before lock?
- Disappears after lock but before settlement?

**Design decisions needed**:
- Grace period for reconnection?
- Forfeit stake to opposing player?
- Refund and skip that player?
- Consolation pairing with a "bot" opponent?

### 🟡 Disclose() calls — audit every one

The contract uses `disclose()` in multiple places. Each `disclose()` **leaks that specific boolean**. An attacker correlating multiple rounds could potentially reconstruct private values from disclosed comparisons.

**Needed**: careful audit of the disclosure surface. Our current `enter_round` discloses:
- `roundPhase == 0` (fine, round state is public anyway)
- `!secretCommitments.member(player_pk)` (leaks: "has this pk entered?" — same info as ledger state)

These are safe. But future circuits (match result submission) need tight disclosure minimization.

---

## 2. Adversarial Scenarios

### 🔴 Sybil attacks

One human operating 10 wallets = massive edge. They can:
- Control a larger fraction of the player pool
- Increase probability of being paired with another of their own wallets
- Win against themselves (lossless wash trading to extract rakeback)

**Mitigations**:
- KYC integration via DIDzMonolith/KYCz (but defeats privacy narrative)
- Stake-gated entry (higher stakes = more expensive sybils)
- Rate-limiting per IP / per proof server session
- Social proof via DIDz identity credentials
- Pool entry fees (the economic math has to make sybil-ing unprofitable)

### 🔴 Collusion

Two players coordinate:
- Both pick secret = 7, guess = 7
- If paired together, both guess correctly, both win split
- If not paired, still a free roll
- Over many rounds, a coordinated pair extracts expected value from random players

**Mitigations**:
- Limit max players per "cluster" from same IP/identity
- Tournament formats where paired players can't reset quickly
- Deterministic pairing that doesn't favor repeat matchups

### 🟡 Timing / entry ordering information leakage

Even with hidden commitments, **entry order** is public. A player who commits last knows the player count exactly. Over many rounds, patterns emerge: who enters early, who waits.

**Mitigation**: randomize commitment display order on the indexer, enforce minimum commit window.

### 🟡 Proof server as oracle

The match settlement requires someone to run the `submit_match_result` circuit with knowledge of all secrets. **Who is this?**

Options:
- Contract owner (centralized — single point of failure, trust issue)
- Each player submits a proof about their own pair (coordination problem)
- Dedicated oracle service with TEE / MPC (complex, expensive)
- Sealed settlement where each player reveals only for their own pair to a trusted aggregator

**Current design leaves this ambiguous. Needs explicit protocol.**

### 🟡 MEV / front-running on entry

Even with hidden commitments, an attacker monitoring the mempool can:
- See the total stake pool building up
- Enter last to get maximum information
- Drop out (cancel tx) if they don't like the number of participants

**Mitigations**:
- Private mempool (zkSync-style)
- Sealed entry phase
- Minimum commit duration

---

## 3. UX & Operational Disasters Waiting to Happen

### 🔴 Proof server availability

ZK proof generation for entry + settlement requires a proof server. If the proof server is down or slow:
- Players can't commit → rounds fail to fill
- Players can't generate proofs to claim winnings
- **This is a live outage**: angry players, chargebacks, reputational damage

**Mitigations**:
- Multiple proof server endpoints (failover)
- Client-side queueing with exponential retry
- Clear status indicators in UI
- Incident response runbook

### 🔴 ZK proof generation on low-end hardware

Proof generation is CPU-intensive. **Chuck (Haswell i7-4770) can't run zkir at all.** Many users' laptops will struggle. Mobile is a nightmare.

**Mitigations**:
- Server-side proof generation (defeats privacy for hosted mode)
- Cloud proof provider (Aleo pattern)
- Progressive disclosure: "Your machine may take 30s to generate this proof"
- Hardware requirements published clearly

### 🟡 Onboarding friction is brutal

To play BlindOracle on mainnet, a user needs:
1. Lace wallet installed
2. Wallet funded with NIGHT tokens
3. On-ramp from fiat to NIGHT (does this even exist yet?)
4. Understanding of what ZK proofs are
5. Patience through proof generation

**Tesla's 2% problem**: each step loses ~50% of users. Compound drop-off = **maybe 3% of visitors complete a round**.

**Mitigations**:
- Hackathon: free testnet faucet, pre-funded test accounts
- v1: integrate fiat on-ramp (MoonPay, Ramp, etc. once Midnight support exists)
- Onboarding flow that educates as it goes
- "Try it without wallet" mode with fake play money

### 🟡 Mobile users

If a meaningful % of your audience is mobile:
- Lace doesn't support mobile (as of 2026)
- ZK proof generation on mobile CPUs is slow
- UX for commit/reveal on small screens is cramped

**MVP decision**: desktop-only for hackathon. Add "mobile coming soon" gate.

### 🟡 Customer support & dispute resolution

What if:
- A player claims their wallet was hacked and commitments were forged?
- A player says the UI lied about their committed value?
- A player insists they won when the contract says they lost?

**Needed**:
- Support email / Discord channel
- Transaction history viewer with cryptographic audit trail
- Dispute resolution policy
- Explicit "not your keys, not your coins" disclaimers

### 🟡 Lost access / key loss

If a player loses their wallet:
- Their committed stake is locked
- They can't claim winnings
- No customer service can help (non-custodial)

**Mitigation**: clear warnings + optional identity-bound recovery via DIDz (social recovery, guardian keys)

---

## 4. Economic Model — Does the Math Work?

### 🔴 Gas cost vs. stake size

Every commit / match-result / settlement is a transaction. On Midnight:
- NIGHT transaction fees (DUST as gas)
- Proof generation cost (time + compute)

If a round has a $1 stake and costs $0.50 in fees... **nobody plays**.

**Needed**:
- Explicit economic model: what's the minimum viable stake?
- Batched operations (multiple matches in one tx)
- Fee subsidies during bootstrap
- Tournament format where fees amortize across many rounds

### 🟡 Protocol fee sustainability

2% fee on a $10 stake = $0.20 per player per round. To cover:
- Proof server hosting
- Indexer hosting
- Frontend hosting
- Customer support
- Legal retainer

Need to calculate: **rounds per day × players per round × avg stake × 2% = revenue**. Can that cover ops? Probably not at launch. Expect to subsidize with funding.

### 🟡 Win-rate expectation problem

MVP game has ~10% hit rate. Players will **lose 90% of matches**. Retention suffers.

**Mitigation**: reframe the game around *near-misses*, *streaks*, *style* — not just win/loss. Think video poker psychology: most hands don't hit, but frequent small wins keep engagement.

---

## 5. Regulatory & Legal Gaps (See Also: GAMBLING_COMPLIANCE.md)

### 🔴 KYC / age verification

Even offshore sites now require KYC. For US sweepstakes play, **21+ age verification is required**. Onboarding friction increases dramatically.

### 🔴 Tax reporting

Winners owe taxes on prizes. US: W-2G for winnings >$600 at 300x odds. Platform must issue reports, players owe income tax.

**Implication**: winners must provide SSN/EIN for prize claims. Privacy narrative collides with tax reality.

### 🟡 Advertising restrictions

Can't advertise "gambling" in restricted states. Can't use certain keywords in ads (Google/Facebook policies). Must disclaim "gambling problem? call 1-800-GAMBLER."

### 🟡 Responsible gaming tooling

Even pre-launch, need:
- Self-exclusion mechanism
- Deposit / session limits
- Problem gambling resources link
- Cooling-off periods

### 🟡 Terms of Service, Privacy Policy, Cookie Policy

For any real product, legally required. For hackathon, good practice.

---

## 6. Technical Debt Lurking

### 🟡 Contract upgrades

Compact contracts are **immutable** once deployed. If the `submit_match_result` logic has a bug, funds can be stuck or drained.

**Mitigations**:
- Upgradeable proxy pattern (if Midnight supports)
- Thorough testing + audit before mainnet
- "Emergency pause" mechanism (breaks decentralization)
- Circuit-breaker: max payout cap per round during beta

### 🟡 Indexer as single point of failure

The indexer powers all UI queries. If it's down:
- Can't see round state
- Can't see other players
- Can't see results

Multi-indexer failover or user-runnable indexer mode needed for v1.

### 🟡 Audit before mainnet

Real money on-chain = audit required. Reputable ZK audit firms: Zellic, Trail of Bits, OtterSec, Veridise. Budget: $50-150K, 4-12 week engagement.

---

## 7. Product-Market Fit Unknowns

### 🟡 Is commit-reveal inherently engaging?

The emotional promise is "suspense from hidden information." But:
- Poker has hidden information AND social reads AND long arcs
- Prediction markets have hidden info AND research value
- BlindOracle MVP has hidden info AND... a 10% hit rate

**Open question**: will playtesters actually find this fun for more than 5 rounds?

**Validation plan**:
- Playtest with 20+ people post-hackathon
- Measure retention, session length, NPS
- Iterate rules BEFORE major dev investment

### 🟡 Who plays the first 100 rounds?

Cold start problem. A prediction game needs enough players to fill rounds. Launch strategy:
- Closed beta with DIDzMonolith community
- Scheduled "round times" (e.g., every hour) to concentrate participation
- Discord bot that announces open rounds

### 🟡 Streaming / spectator hook

The God Window could be content gold — IF spectators can easily find rounds to watch. Need:
- Streaming-friendly layout
- Overlay graphics for OBS
- Scheduled "tournament" rounds with commentator-friendly timing

### 🟡 Brand differentiation from ProofOrBluff

POB is also commit-reveal + card game + Midnight. BlindOracle needs a clear differentiator:
- POB = card game, real cards, bluffing dynamics
- BlindOracle = pure number prediction, oracle/mystical theme

Make sure these two products don't cannibalize each other.

---

## 8. Brand & Trademark

### 🟡 "BlindOracle" name availability

Quick check needed:
- Trademark search (USPTO, WIPO)
- Domain availability (blindoracle.io? blindoracle.game? blindoracle.network?)
- Social handles
- Existing crypto/gaming projects with similar names

Before investing in brand, confirm it's ownable.

### 🟡 Logo / visual identity

Currently no logo. For hackathon pitch, need:
- Wordmark / logotype
- Icon / favicon
- Social card graphics
- Pitch deck visuals

---

## 9. Things the Brief Got Right (Keep These)

- "Fairness doesn't require full visibility" — **this is genuinely Midnight-native**
- God Window as optional post-settlement reveal — **dramatically good**
- Four-phase round structure — **clean, explainable**
- Simple MVP (secret number + guess) — **right scope for hackathon**
- Thematic framing (oracle, hidden truth) — **differentiating**

---

## 10. Priority Matrix

| Item | Priority | Phase |
|------|----------|-------|
| Proper randomness source (VRF or beacon) | 🔴 P0 | Pre-mainnet |
| Commitment salt (prevent malleability) | 🔴 P0 | MVP |
| Proof server failover | 🔴 P0 | v1 |
| Sybil protection strategy | 🔴 P0 | v1 |
| Collusion detection / mitigation | 🟡 P1 | v1 |
| Match settlement oracle design | 🔴 P0 | MVP |
| Economic model sustainability | 🟡 P1 | v1 |
| Contract audit | 🔴 P0 | Pre-mainnet |
| Gambling compliance strategy | 🔴 P0 | Pre-real-money |
| Trademark / brand protection | 🟡 P1 | Pre-launch |
| Responsible gaming tooling | 🟡 P1 | Pre-real-money |
| Retention / fun validation playtests | 🟡 P1 | Post-hackathon |
| Mobile UX | 🟢 P2 | v2 |
| Spectator mode | 🟢 P2 | v2 |
| Tournament formats | 🟢 P2 | v2 |

---

## 11. Questions for John

Before next session, worth thinking about:

1. **What's the target market?** US (sweepstakes), EU (Malta license), global crypto (Curaçao)? This shapes everything.
2. **What's the realistic stake range?** $0.10 casual? $1-10 regular? $100+ high-roller? Shapes fee math and UX.
3. **Is this a standalone product or an ecosystem showcase?** Standalone = needs real retention; showcase = needs memorable demo moments.
4. **Who runs the match settlement oracle in Phase 1?** You? A multisig? A TEE? This is unresolved.
5. **What's the Midnight testnet deployment plan?** Hackathon demo on testnet only, or aim for mainnet within 6 months?
6. **Brand check** — is BlindOracle trademark-available? Domain-available? Is there any existing project by this name?
7. **POB relationship** — are BlindOracle and proofOrBluff complementary or competitive? Same players? Different audiences?

---

*This doc is intentionally paranoid. Many items will be non-issues. But identifying them early beats discovering them in production.*
