# BlindOracle — Blind Spots & Real Solutions

**Written by**: Penny 🎀
**For**: John
**Purpose**: Adversarial review of the project, paired with **actual solutions** for every problem identified — not just problem spotting.

This is the "here's what could go wrong AND here's how to fix it" doc. Every section has:
1. **The problem** — what could break
2. **Severity** — 🔴 P0 / 🟡 P1 / 🟢 P2
3. **The solution** — concrete design or implementation
4. **Status** — addressed in v1 / planned / open

---

## Problem 1: Randomness Grinding Attack

### The problem 🔴 P0
MVP derives pairing entropy from the set of commitments. A sophisticated attacker with rapid re-commit ability could:
1. Watch the current set of committed pks
2. Compute what entropy would result from each candidate commitment value
3. Pick the commitment that biases their pairing toward a favorable opponent

This is a classic commit-reveal vulnerability and it's real.

### The solution ✓
**Use Midnight's block hash as the pairing seed.**

Add to the contract:
```compact
export ledger lockBlockHash: Bytes<32>;

witness get_block_hash(): Bytes<32>;

export circuit lock_round(): [] {
  // ... existing auth checks ...

  // Capture the block hash at lock time as the pairing seed.
  // Attacker would need to control block production to bias.
  lockBlockHash = disclose(get_block_hash());

  roundPhase = 2;
}
```

Off-chain pairing becomes:
```ts
const entropy = sha256(lockBlockHash + concatenated_sorted_commitments);
```

**Why this works**: a block producer doesn't know which players are in the round when they produce the block, and players don't know the block hash until it's produced. Neither can grind.

### Status
**Planned for v1** — need to verify Midnight exposes block hashes via witnesses (check compact SDK).

### Alternative (if block hash unavailable)
**Two-phase commit-reveal for the seed**:
1. Each player commits `hash(random_seed)` during entry.
2. After lock, players reveal their seeds; chain XORs them.
3. Anyone who fails to reveal is excluded (refunded, not slashed).
4. The last committer has NO influence (their seed commits before others reveal).

Adds one round-trip but is provably grinding-resistant.

---

## Problem 2: Commitment Malleability

### The problem 🔴 P0
Without a salt, two players who pick the same answer produce identical commitments. An observer can:
- Learn that two players chose the same number (without knowing which number)
- Over many rounds, build a statistical profile

### The solution ✓ **(already implemented)**
The current contract uses `persistentHash<Vector<2, Bytes<32>>>([answer_bytes, salt])` — the salt is a 32-byte random value mixed into the hash. Identical answers + different salts → different commitments.

Client-side (in `blindoracle-api/src/game-logic.ts`):
```ts
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}
```

UX requirement: the client must persist salt in localStorage keyed by roundId so the player can reveal later via God Window.

### Status
**Addressed in v1 contract.** ✅

---

## Problem 3: Match Settlement Oracle

### The problem 🔴 P0
Someone must call `submit_match_result(a, b, payoutA, payoutB)` with knowledge of both players' answers. Who is this?

Currently the contract uses the owner. That's:
- **Centralized** — single point of failure
- **Trust-requiring** — the owner knows all answers
- **Not verifiable** — players trust the owner computed payouts correctly

### The solution ✓
**Migrate settlement to a trustless MPC or per-player ZK proof**.

**Option A — Per-player settlement proof** (recommended):
- Each player's client computes `scoreMatch(pair, myAnswer, myGuess, opponentAnswer, opponentGuess)` after lock.
- But the opponent's answer is still hidden. Solution: each pair does a **selective disclosure** protocol.
- Both players in a pair submit a ZK proof: "I know MY answer, and based on the commitments of MY OPPONENT, here's the correct payout — and I can prove it without revealing MY answer."
- Contract verifies both players submit matching payout amounts.
- Neutralizes the oracle problem.

Requires a new circuit signature:
```compact
export circuit submit_my_result_proof(
  my_pk: Bytes<32>,
  opponent_pk: Bytes<32>,
  my_claimed_payout: Uint<64>,
  // ... ZK proof of (my_answer, my_guess) + my match against opponent's commitment
): [] { ... }
```

Once both players in a pair have submitted, the chain reconciles and writes final payouts.

**Option B — TEE-based settlement** (simpler):
- An Intel SGX / AWS Nitro enclave runs the settlement.
- Both players encrypt their answers to the enclave's public key.
- The enclave computes payouts and signs them.
- Contract verifies the TEE signature.
- **Trade-off**: requires TEE trust (not zero-trust), but simpler than Option A.

**Option C — DKG multisig settlement** (medium complexity):
- 3-5 trusted parties run a distributed key generation protocol.
- Players encrypt answers to the shared pubkey.
- Quorum signs off on settlement.
- **Trade-off**: still requires trusting the quorum not to collude.

### Status
**Open — v2 work.** Current MVP uses trusted owner; acceptable for hackathon demo but must resolve before any real-money play.

**My recommendation**: Option A. It's the only fully trustless design and fits Midnight's ZK-first ethos.

---

## Problem 4: Sybil Attacks

### The problem 🔴 P0
One human with ten wallets can:
- Fill their own guess buckets (crowding out legitimate players)
- Increase probability of same-cluster pairings (wash-trading against themselves)
- Farm protocol-fee rebates / promotional rewards

### The solution ✓
**Stake-gated + identity-gated entry**.

**Layer 1 — Economic gating**:
- Minimum stake makes running N wallets cost N × stake upfront
- At $1+ stakes, Sybils become unprofitable for most attack vectors

**Layer 2 — Identity gating via DIDz/KYCz** (optional, per-round):
- Rounds can optionally require a DIDz credential attesting "human" (KYCz level 1)
- Player submits a ZK proof of valid KYCz credential alongside entry
- Preserves privacy: the identity itself stays hidden, only proof-of-uniqueness is disclosed
- Integration point: `blindoracle-api` imports DIDz SDK, `enter_round` circuit optionally verifies a DID credential

Config toggle:
```ts
interface RoundConfig {
  // ... existing fields ...
  requireHumanCredential: boolean;        // require KYCz Level 1
  requireStakeDiscount: boolean;          // discount if KYCz Level 2+
}
```

**Layer 3 — Rate-limit per proof server session** (client-side heuristic):
- Proof server tracks commitments per session
- Too many rapid commitments from one session → delay or reject
- Cheap attacker mitigation; not a hard guarantee

### Status
**Planned for v1** — requires DIDz/KYCz integration to be production-ready first.

---

## Problem 5: Collusion

### The problem 🔴 P0
Two players coordinate off-chain:
- Both pick answer=7, guess=7
- If paired with each other, both win (split)
- If not paired, they've committed to standard play
- Expected value over many rounds > random play

### The solution ✓
**Collusion-resistant matching + behavior detection**.

**Design A — Anti-cluster pairing**:
- Detect pairs of pks that have been matched unusually often across recent rounds
- Deliberately exclude from pairing together
- Implementation: a small rolling history buffer in the contract (last N rounds)

**Design B — Same-IP / same-session detection** (off-chain):
- Indexer tracks client fingerprint (IP subnet, wallet account age, etc.)
- Heuristic scoring flags suspicious pairs
- Manual review for high-stakes rounds

**Design C — Economic deterrent**:
- Split payouts carry a 50% penalty → splits are net negative vs random play
- Forces colluders to either a) actually beat the game OR b) lose money on splits

Config:
```ts
interface RoundConfig {
  splitPenaltyBps: number;  // additional fee on split payouts (e.g., 5000 = 50%)
}
```

**Design D — Tournament format with rotation**:
- Over a tournament, each player is paired at most ONCE with any given other player
- Multi-round format kills simple 2-person collusion

### Status
**Design D planned for Tournament Mode (future).** Design C is a simple on-chain change (one parameter).

---

## Problem 6: Proof Server Availability

### The problem 🔴 P0
ZK proof generation requires a proof server. If it's down:
- Players can't commit
- Players can't generate claim proofs
- UX is a disaster

### The solution ✓
**Multi-provider proof server failover**.

Client-side implementation:
```ts
// blindoracle-ui config
const PROOF_SERVERS = [
  'https://proof.blindoracle.io',           // primary (our hosted)
  'https://proof-2.blindoracle.io',         // secondary (our hosted, different region)
  'https://proof.midnight-community.io',    // community-run fallback
];

async function generateProof(input) {
  for (const server of PROOF_SERVERS) {
    try {
      return await fetch(server, { ... });
    } catch (e) {
      console.warn(`Proof server ${server} failed, trying next`);
    }
  }
  throw new Error('All proof servers unavailable');
}
```

**Operational layer**:
- Run proof server on 2+ regions (AWS + Fly.io)
- Health-check endpoints monitored by Grafana
- Auto-failover in client based on response time
- Public status page: `status.blindoracle.io`

**Long-term**:
- Encourage community proof server operators (open-source image, docker-compose file)
- Potentially reward operators with a % of protocol fees

### Status
**Planned for v1.** Scaffold has single-server config; failover added before testnet.

---

## Problem 7: ZK Proof Generation on Low-End Hardware

### The problem 🟡 P1
Proof generation is CPU-intensive:
- **Chuck's Haswell CPU can't run zkir at all** — hard failure
- Mid-range laptops take 10-30s per proof
- Mobile is impractical

### The solution ✓
**Progressive UX + optional server-side proving**.

**Client-side**:
- Benchmark on first load: "Your device will take ~12s per action"
- Clear UI during proof generation with progress bar
- Cancel/retry on timeout
- Explicit browser/device requirement text: "Requires a modern desktop browser; mobile coming later"

**Server-side (optional, for "easy mode" users)**:
- Players opt-in to server-side proving
- Client uploads witness values to a trusted service (breaks the "only you know your answer" promise)
- Service generates proof and returns it
- **Clearly labeled**: "Server-side proving: your answer is briefly visible to our proof service. Full privacy requires client-side proving."

This is the Aleo pattern. Reasonable compromise for onboarding.

**Future**:
- WebAssembly + SIMD optimizations (part of the Midnight SDK roadmap)
- Chunked proving (resume from partial state)
- Browser GPU acceleration (years out)

### Status
**Planned for v1** — server-side proving is a v2 feature, client-side with benchmarking in v1.

---

## Problem 8: Onboarding Friction

### The problem 🟡 P1
A user needs: Lace wallet + NIGHT tokens + on-ramp + patience for ZK proving. Each step loses ~50% of users. Compound drop-off ≈ **3% of visitors complete a round**.

### The solution ✓
**Tiered onboarding with graceful degradation**.

**Tier 0 — "Try it" mode** (no wallet):
- Uses an ephemeral in-browser keypair
- Stake is virtual (no real NIGHT)
- Plays against AI opponents + other Tier 0 players
- Converts to real mode when user wants to stake real tokens

**Tier 1 — Testnet mode**:
- Guides user through Lace install (inline walkthrough)
- Auto-calls testnet faucet for the user's pk
- Full real contract interaction on testnet
- No real-world economic risk

**Tier 2 — Mainnet play**:
- Requires funded Lace wallet
- Full game with real stakes
- Additional KYC gate for sweepstakes / high-stakes modes

**Fiat on-ramp**:
- Partner with MoonPay/Ramp/Transak for NIGHT purchase (when support exists)
- Credit card → NIGHT → Lace in 3 clicks
- Big friction reducer

**Referral-gated invites**:
- Early tiers invite-only via DIDz social-graph
- Creates scarcity, curated early community
- Reduces bot/farm pressure

### Status
**Tier 0 planned for v1.** Tier 1 is current hackathon state.

---

## Problem 9: Economic Sustainability

### The problem 🟡 P1
Gas cost + proof cost per transaction must be << stake for the game to make economic sense. At $1 stakes with $0.50/tx costs, the game is dead on arrival.

### The solution ✓
**Batch operations + fee subsidies + stake tiering**.

**Batch operations**:
- `submit_match_result` already handles one pair per call
- Add `submit_multi_match_results(pairs: Vector<N, MatchTuple>)` that settles N pairs in one tx
- Gas amortized across all pairs

**Fee subsidies (during bootstrap)**:
- Protocol treasury pays gas for the first X rounds / players
- Covered by hackathon prize money / foundation grants
- Sunsets when volume + fees cover ops

**Stake tiering**:
- **Bronze**: $0 stake (free play, ad-supported)
- **Silver**: $1-10 stakes (casual)
- **Gold**: $100+ (high-stakes tournaments)
- Fee % scales with tier (higher fee at low stake, lower % at high stake)

**Economic model (back-of-envelope)**:
- 100 rounds/day × 10 players × $1 stake × 2% fee = $20/day revenue
- Proof server + indexer cost ~$50/day minimum
- Breakeven at ~250 rounds/day or higher stakes
- Probably need $10-100k in grant/seed before revenue covers ops

### Status
**Planned economic modeling work for v1.** Batch circuits are a straightforward contract addition.

---

## Problem 10: Retention — The "10% Hit Rate" Trap

### The problem 🟡 P1
MVP: guess 1 of 10, win 10% of the time, lose 90% of the time. Players get frustrated. Churn.

### The solution ✓
**Reframe the emotional arc + add progression**.

**Reframe**:
- Don't emphasize win/loss — emphasize **near-misses**, **correct reads**, **streaks**
- Show "You guessed 7; opponent was 6. So close."
- Celebrate skill signals even on losses

**Progression**:
- XP per participation (not just wins)
- Visual levels (Novice → Adept → Oracle)
- Cosmetic unlocks (UI themes, reveal animations)
- Non-financial rewards that sustain engagement during variance

**Daily streaks**:
- Playing N rounds/day gives a streak multiplier
- Correct-guess streaks give a bonus payout
- Turn variance into a feature, not a bug

**Near-miss UX**:
- "0-off guess": direct correct
- "1-off guess": shown as a near-miss (opponent was 6, you guessed 7)
- "Same-bucket guess": you and opponent both guessed each other's bucket
- Surface these in post-round summary → feels less punishing

**Tournament modes** (future):
- Multi-round with aggregate scoring
- Top-3 get paid even if they didn't win every round
- Variance smooths over many rounds

### Status
**Planned for v1** — XP + near-miss UX are UI-only changes.

---

## Problem 11: Mobile Experience

### The problem 🟡 P1
- Lace doesn't support mobile
- ZK proof gen on mobile is painful
- Cramped UI

### The solution ✓
**Desktop-first, mobile-tolerant, mobile-native later**.

**v1**: "Best experienced on desktop" gate — graceful mobile read-only mode (spectate + check results, no entry).

**v2**: Progressive Web App with client-side proving on iPhone 14+ / flagship Android (WebCrypto is fast enough).

**v3**: Native mobile apps with integrated mobile wallet (when Midnight mobile SDK exists).

### Status
**v1 desktop-only is current plan.**

---

## Problem 12: Customer Support & Disputes

### The problem 🟡 P1
- Player's wallet was hacked, they dispute
- Player claims UI lied about their commitment
- Player says they won but contract says they lost

### The solution ✓
**Audit trail + documented dispute process**.

**Every transaction gets**:
- On-chain tx hash
- Cryptographic receipt with commitment, guess, salt (stored client-side)
- Proof-of-outcome (zkproof the player can export)

**Dispute process**:
- Support email: support@blindoracle.io
- Discord #support channel
- Clear docs: "If you lost access, we cannot recover your wallet; that's the nature of non-custodial"
- For legitimate disputes (contract bug, oracle error), compensation from protocol treasury

**Insurance pool**:
- Small % of fees diverted to a claims pool
- Covers documented protocol bugs, NOT user error

### Status
**Planned for v1.** Scaffold has no support infrastructure yet.

---

## Problem 13: Lost Wallet / Key Loss

### The problem 🟡 P1
Non-custodial means lost keys = lost funds.

### The solution ✓
**Optional DIDz-based social recovery**.

Integration with DIDz/AgenticDID:
- Player sets up 3-of-5 guardian pks via DIDz
- Lost key recovery: guardians sign off on new pk binding
- Protocol recognizes the new pk via DIDz attestation
- Old pk's funds transfer to new pk

Off-chain enforcement for BlindOracle specifically:
- If player recovers wallet, they can sign a message proving control of new pk
- Submit to contract via `rebind_pk(old_pk, new_pk, proof)` circuit
- Payouts address updated

### Status
**v2 work** — requires DIDz social recovery to be production-ready.

---

## Problem 14: Contract Upgradability

### The problem 🟡 P1
Compact contracts are immutable. A bug in `submit_match_result` could strand funds permanently.

### The solution ✓
**Emergency circuit breaker + upgrade path via migration**.

**In-contract**:
```compact
export sealed ledger emergencyPauseKey: Bytes<32>;
export ledger isPaused: Boolean;

export circuit emergency_pause(): [] {
  const sk = local_secret_key();
  const caller_pk = derive_caller_pk(sk);
  assert(disclose(caller_pk == emergencyPauseKey), "Not pause authority");
  isPaused = true;
}

// Every state-mutating circuit:
export circuit enter_round(...) {
  assert(disclose(!isPaused), "Contract paused");
  // ... rest
}
```

**Upgrade path**:
- Deploy a new contract version
- Old contract's `new_round` permanently blocked in an upgrade phase
- Player claims migrate via a migration circuit:
  - Old contract: `export_claim_proof()` — proof of outstanding payout
  - New contract: `import_claim_proof()` — honors it

Trade-off: an "emergency key" reduces decentralization. Mitigation: put pause authority in a 5-of-9 multisig of reputable community members.

### Status
**Planned for mainnet audit prep.** Not in hackathon MVP.

---

## Problem 15: Contract Audit

### The problem 🟡 P1
Real funds on-chain = audit required. ZK-aware audit firms: Zellic, Trail of Bits, OtterSec, Veridise. Budget $50-150K, 4-12 week engagement.

### The solution ✓
**Staged audit process**.

- **Pre-audit self-review**: line-by-line review against known Compact best practices
- **Internal review**: 2-3 Midnight ambassadors review without payment
- **Small paid audit**: community auditor ($10-20K) for surface-level issues
- **Full audit**: Zellic or Trail of Bits before mainnet ($50-100K)

Timeline: 6-9 months from hackathon demo to audit-complete mainnet contract.

### Status
**Planned. Not urgent for hackathon.** Free-play demo doesn't need an audit.

---

## Problem 16: Regulatory / Gambling Law

### The problem 🔴 P0
See [`GAMBLING_COMPLIANCE.md`](./GAMBLING_COMPLIANCE.md) for the full analysis.

TL;DR: free-play fine, real-money play requires sweepstakes structure in US or offshore licensing for most global markets.

### The solution ✓
**Path A → Path B → Path C** staged approach:

- **Hackathon** = Path A (free-play, unlimited US reach)
- **v1** = Path B (sweepstakes, US-compliant, Stake.us / Chumba model)
- **v2 scale** = Path C (offshore-licensed for RoW, US block OR US sweepstakes parallel)

### Status
**Path A is current.** Path B requires $50-150k legal + compliance budget.

---

## Problem 17: Tax Reporting

### The problem 🟡 P1
- W-2G required for winnings > $600 at 300x odds
- Platform must issue reports, winners owe income tax
- Privacy narrative collides with tax reality

### The solution ✓
**Optional KYC at winnings-claim time**.

- Sub-$600 rounds: no KYC needed (stay private)
- Over $600 trigger: winner provides KYC for tax reporting before claim
- Below-threshold winners stay fully private
- KYC via DIDz/KYCz integration (ZK-preserving: only proof-of-identity is shared, not raw data)

### Status
**v2 work** when real-money launches.

---

## Problem 18: Advertising Restrictions

### The problem 🟢 P2
Can't advertise "gambling" in restricted states or on most ad platforms.

### The solution ✓
- Use "prediction game", "skill match", "oracle contest" in US marketing
- "Bet", "gamble", "wager" only in offshore-licensed markets
- Geo-targeted ad campaigns
- Organic growth via DIDzMonolith community first

### Status
**Marketing work, not engineering.**

---

## Problem 19: Brand Name & Trademark

### The problem 🟢 P2
"BlindOracle" may be taken. Before investing in brand:
- USPTO trademark search
- Domain check (blindoracle.io, .game, .network)
- Social handles
- Crypto project search

### The solution ✓
1. USPTO search (free, 1 hour)
2. Domain check via Namecheap/GoDaddy
3. Social handles via Namechk
4. Crypto search via CoinGecko + GitHub

If conflicts, alternate brand candidates:
- **DelphicDApp** / **Delphi.game**
- **OracleTell** / **TheOracleOfOmission**
- **Divination Protocol** / **TheDivinationGame**

### Status
**Do this before hackathon demo day.** 1-hour task.

---

## Problem 20: Cold Start (First 100 Rounds)

### The problem 🟢 P2
A prediction game needs enough players to fill rounds.

### The solution ✓
**Seeded community + scheduled rounds**.

- Launch in DIDzMonolith community first
- "Oracle Hour" — scheduled rounds every hour during peak engagement
- Discord bot announces open rounds, links to UI
- Match-making bots fill out low-player rounds initially (clearly labeled "AI opponent")
- Achievement badges for early players

### Status
**v1 launch strategy.**

---

## Problem 21: POB ↔ BlindOracle Cannibalization

### The problem 🟢 P2
ProofOrBluff (POB) and BlindOracle are both Midnight commit-reveal games. Will they split audience or complement?

### The solution ✓
**Clear positioning + cross-promotion**.

- **POB** = Card game, 52-card deck, social reads, bluffing dynamics. Multi-round, deep gameplay.
- **BlindOracle** = Pure number prediction, mystical/oracle theme. Fast rounds (2-5 min), low-friction.

**Cross-promotion**:
- Shared Lace wallet experience across both
- Unified DIDz identity (your wins in POB boost your BlindOracle rank)
- "Play both, earn bonus" achievements
- Joint DIDzMonolith "Games" hub

Both appeal to different moods — fast casual (BlindOracle) vs deep strategy (POB).

### Status
**Positioning clear. Cross-promotion for v1.**

---

## Priority Summary

| Priority | Problem | Solution | When |
|----------|---------|----------|------|
| 🔴 P0 | Randomness grinding | Block-hash beacon OR two-phase seed | Pre-mainnet |
| ✅ Done | Commitment malleability | Salt in persistentHash | Already in v1 |
| 🔴 P0 | Match oracle | Per-player ZK proofs | v2 |
| 🔴 P0 | Sybil attacks | DIDz/KYCz + stake gating | v1-v2 |
| 🔴 P0 | Collusion | Anti-cluster pairing + split penalty | v1 |
| 🔴 P0 | Proof server failover | Multi-provider config | v1 |
| 🔴 P0 | Gambling law | Path A → B → C staging | Pre-real-money |
| 🟡 P1 | ZK hardware cost | Benchmarking + opt-in server proving | v1-v2 |
| 🟡 P1 | Onboarding | Tier 0 "try-it" mode | v1 |
| 🟡 P1 | Economics | Batch circuits + subsidies | v1 |
| 🟡 P1 | Retention | Near-miss UX + XP + streaks | v1 |
| 🟡 P1 | Mobile | Read-only → PWA → native | v1 → v3 |
| 🟡 P1 | Support/disputes | Receipts + policy + treasury | v1 |
| 🟡 P1 | Lost wallets | DIDz social recovery | v2 |
| 🟡 P1 | Upgradability | Pause circuit + migration | Pre-mainnet |
| 🟡 P1 | Audit | Staged review → pro audit | Pre-mainnet |
| 🟡 P1 | Tax reporting | KYC at winnings threshold | v2 |
| 🟢 P2 | Ad restrictions | Careful copy + geo-targeting | v1 |
| 🟢 P2 | Trademark | USPTO search (1 hr) | **Before demo** |
| 🟢 P2 | Cold start | Seeded community + schedules | v1 launch |
| 🟢 P2 | POB cannibalization | Clear positioning + cross-promo | v1 |

---

## v3 Pool-Specific Problems (New)

### Problem 22: Pool Observability via nextPoolToAssign

#### The problem 🟡 P1
The `nextPoolToAssign` counter is public on-chain. A sophisticated player can query the ledger, see "next assignment = pool 1", and time their tx to land in pool 1 (or wait if they want pool 2). This defeats the "invisible pool" design goal.

#### The solution ✓
**Hash-based assignment** using a sealed round-secret + player pk.

Add a witness-provided round entropy committed at `new_round()`:
```compact
witness get_round_assignment_secret(): Bytes<32>;

// In enter_round, replace round-robin with:
const assignment_hash = persistentHash<Vector<2, Bytes<32>>>([
  pk_disclosed,
  roundAssignmentSecret  // committed at round start, public after
]);
// Convert to pool_id: take bytes mod poolCount
```

Players can't predict their pool without knowing `roundAssignmentSecret`, which is committed but not revealed until lock (revealed only so observers can verify assignments post-hoc).

#### Status
**Planned for v4.** MVP ships with observable round-robin; hash-based is a quick upgrade.

---

### Problem 23: Pool Imbalance / Unfair Fills

#### The problem 🟡 P1
With round-robin assignment, pool 0 fills with early players, pool 1 with mid-round, pool 2 with latecomers. If players who enter later have more information (e.g., they can see which guess buckets are full), pool 2 has a "skilled late-comer" advantage.

#### The solution ✓
**Bounded entry windows + shuffle at lock**.

**Option A — Shuffle at lock**:
- During entry, players go into a "waiting pool" (pool -1)
- At `lock_round`, all waiting players are deterministically re-assigned to pools 0-2 via entropy-seeded shuffle
- Round-robin is abandoned; pools are filled ATOMICALLY at lock

**Option B — Entry time matters equally**:
- Accept that late entrants have more info; compensate with a small early-entry bonus (XP, cosmetic)
- Design the game so information asymmetry is limited (random pool means you can't exploit info anyway)

**Recommended**: Option A for competitive rounds, Option B for casual rounds.

#### Status
**Option A is planned for tournament mode.** Standard rounds ship with round-robin.

---

### Problem 24: Bot Psychology Disclosure

#### The problem 🟢 P2
If players discover that bots are "just UI fiction" (e.g., by reading our code — it's open source), the psychological effect evaporates. Early-entry players know the pool "looks" fuller than it actually is.

#### The solution ✓
**Transparency + narrative framing**.

Don't hide the bots. Document them prominently:
- In-UI tooltip: "This pool has 6 AI participants to show example plays"
- "AI participants do not affect real matches"
- Frame bots as "a preview of what others are picking"

This removes the psychological trick but preserves the UX benefit (pools don't look empty). Real players still appreciate seeing example entries.

**Alternative**: make bots functional — actually match against bots when player count is low, with clear labeling. This fills the "can't find opponents" gap on quiet nights.

#### Status
**Transparent UX decision for v1.** Document bots plainly. Consider functional bots as a future feature.

---

### Problem 25: Pool Assignment Validator

#### The problem 🟡 P1
The UI trusts the contract's pool assignment. If the indexer is compromised or the UI has a bug, players might be shown wrong pool assignments, leading to confusion at matching time.

#### The solution ✓
**Client-side pool verification**.

After entry, the UI should:
1. Query `playerPool[my_pk]` from the contract
2. Verify it matches what the UI expected
3. Display a "verified" badge on the pool assignment

If mismatch, alert user and log the discrepancy for debug.

#### Status
**Straightforward UI work. Planned for v1.**

---

### Problem 26: House Fee Accumulation Race

#### The problem 🟡 P1
`houseFeeAccumulated` accumulates across all pairs. If `submit_match_result` is called in parallel (multiple owner tx in flight), naive implementations could lose fee increments.

#### The solution ✓ (already addressed)
Compact's ledger state is atomic per-transaction. Each `submit_match_result` call reads `houseFeeAccumulated`, adds the pair's fee, and writes back. Midnight's ledger semantics serialize these updates. No race.

**BUT** the owner must submit match results sequentially (or accept that their txs may settle in any order). The SDK should batch them or submit with nonces.

#### Status
**Non-issue on-chain.** UI guidance: submit match results in sequence or use a batching helper.

---

### Problem 27: Same-Pool Matching Enforcement

#### The problem ✓ (already addressed)
`submit_match_result` asserts `playerPool[A] == playerPool[B]`. If the off-chain matcher accidentally pairs cross-pool players, the transaction reverts. Good.

#### Edge case: what if both players are in pool 0 but the matcher claims they're in pool 1? The assert still passes (A and B are same pool), but the pool attribution is wrong. This could affect UI display of "pool 0 outcomes" vs "pool 1 outcomes" but doesn't affect fairness.

Minor UI validation: cross-reference payouts against `playerPool` mapping when rendering post-settlement summaries.

#### Status
**Resolved by contract. UI validation is nice-to-have.**

---

## Updated Priority Summary (v3)

| Priority | Problem | Solution | When |
|----------|---------|----------|------|
| 🔴 P0 | Match oracle | Per-player ZK proofs | v2 (still open) |
| 🔴 P0 | Sybil attacks | DIDz/KYCz + stake gating | v1-v2 |
| 🔴 P0 | Collusion | Anti-cluster pairing + split penalty | v1 |
| 🔴 P0 | Proof server failover | Multi-provider config | v1 |
| 🔴 P0 | Gambling law | Path A → B → C staging | Pre-real-money |
| 🔴 P0 | Randomness grinding | Block-hash beacon or VRF | Pre-mainnet |
| ✅ Done | Commitment malleability | Salt | v1 contract |
| ✅ Done | Per-pool anti-crowd cap | Composite key | v3 contract |
| ✅ Done | Min-player gating | poolMinRealPlayers + auto-transition | v3 contract |
| ✅ Done | 90/10 split | protocolFeeBps=1000 default | v3 contract |
| ✅ Done | Same-pool matching | On-chain assertion | v3 contract |
| ✅ Done | Abort + refund | abort_round + claim_refund | v2/v3 contract |
| 🟡 P1 | Pool observability | Hash-based assignment | v4 |
| 🟡 P1 | Pool imbalance | Shuffle at lock | v4 |
| 🟡 P1 | ZK hardware cost | Benchmarking + opt-in server proving | v1-v2 |
| 🟡 P1 | Onboarding | Tier 0 "try-it" mode | v1 |
| 🟡 P1 | Economics | Batch circuits + subsidies | v1 |
| 🟡 P1 | Retention | Near-miss UX + XP + streaks | v1 |
| 🟡 P1 | Mobile | Read-only → PWA → native | v1 → v3 |
| 🟡 P1 | Support/disputes | Receipts + policy + treasury | v1 |
| 🟡 P1 | Lost wallets | DIDz social recovery | v2 |
| 🟡 P1 | Upgradability | Pause circuit + migration | Pre-mainnet |
| 🟡 P1 | Audit | Staged review → pro audit | Pre-mainnet |
| 🟡 P1 | Tax reporting | KYC at winnings threshold | v2 |
| 🟡 P1 | Pool verification | UI double-check | v1 |
| 🟢 P2 | Ad restrictions | Careful copy + geo-targeting | v1 |
| 🟢 P2 | Trademark | USPTO search (1 hr) | **Before demo** |
| 🟢 P2 | Cold start | Seeded community + schedules | v1 launch |
| 🟢 P2 | POB cannibalization | Clear positioning + cross-promo | v1 |
| 🟢 P2 | Bot transparency | Document plainly in UI | v1 |

---

## The Most Important Thing

The protocol is sound. The mechanics are correct. The privacy story is clean. The pool architecture adds depth and scalability.

The hardest unsolved problem remains **match settlement oracle** (Problem 3) — even with pools, someone still needs to compute and submit match results with knowledge of both answers. If there's a single technical risk that could kill this project post-hackathon, it's that one. **Pick a design (my vote: Option A per-player ZK proofs) before v1 implementation starts.**

The hardest non-technical problem is **gambling law** (Problem 16). Plan accordingly.

Everything else is execution.
