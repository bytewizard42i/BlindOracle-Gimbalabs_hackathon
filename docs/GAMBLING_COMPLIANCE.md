# BlindOracle — Gambling Compliance & Jurisdictional Strategy

**Status**: Strategic planning doc — NOT legal advice
**Last updated**: April 2026
**Disclaimer**: Everything below is for strategic planning. Before ANY real-money deployment, retain a licensed gaming attorney in every operating jurisdiction. Regulatory environments change quarterly. Treat this doc as a research briefing, not a compliance plan.

---

## TL;DR — The Three Paths

| Path | Risk | Time-to-market | Upside |
|------|------|----------------|--------|
| **A. Free-to-play / Points-only** | Low | Days | Unlimited US reach, no licensing. Zero monetization via entry fees. |
| **B. Sweepstakes (US-legal)** | Medium | Weeks–months | US reach in most states, proven model (DraftKings DFS, Chumba, Stake.us) |
| **C. Offshore-licensed real-money** | High | Months | Full monetization, small addressable US market (VPN/KYC issues), regulatory ceiling |

**Recommended launch path**: **A → B → C** (ship free-to-play for hackathon, evolve to sweepstakes for v1, offshore real-money as v2 if market validates).

---

## 1. Why Gambling Law Matters for BlindOracle

Three features trigger gambling classification in most US states:

1. **Consideration** — players pay to enter (entry fee or stake)
2. **Chance** — outcome is substantially determined by randomness, not skill
3. **Prize** — winners receive something of value

If all three are present → **gambling** → regulated.
If any one is missing → **usually not gambling** → different rules apply.

BlindOracle's MVP has all three. That's the problem to design around.

### The Skill-vs-Chance Question

Some jurisdictions (including several US states) carve out games where skill predominates over chance. The **"predominance test"** is common: if skill is the primary determinant of outcome across many rounds, the game is exempt.

**Is BlindOracle skill or chance?**

- Pure random guess (1-10) → 10% hit rate → **chance-dominant**
- If we add multi-round history, pattern detection, strategic commitment → skill component grows
- With no information about opponent → hard to argue skill predominance in MVP

**Verdict**: MVP as designed is **chance-dominant**. This is a crucial finding.

**Mitigations to shift toward skill**:
- Add player profiles with history stats (public, opt-in)
- Add strategic depth: multi-round tournaments, risk management, bid sizing
- Introduce "reads" — light behavioral signals that reward pattern recognition
- Expand range of choices beyond pure number matching

---

## 2. US Federal Law (Relevant Statutes)

### The Wire Act (1961, 18 U.S.C. § 1084)
- Prohibits **interstate transmission of bets or wagering information** on sporting events
- 2011 DOJ opinion narrowed scope to sports betting only
- 2018 DOJ reversal said Wire Act applies to ALL gambling (challenged in courts)
- 2021 1st Circuit ruled Wire Act applies only to sports betting (binding in that circuit)
- **Current state**: depends on circuit; conservative assumption = applies broadly

### UIGEA (2006, 31 U.S.C. §§ 5361-5367)
- Unlawful Internet Gambling Enforcement Act
- Prohibits businesses from knowingly **accepting payments** in connection with unlawful internet gambling
- Does NOT itself make gambling illegal — it criminalizes the payment processing
- **Critical**: UIGEA targets the operator AND the payment rail
- Exempts: fantasy sports (under specific conditions), skill games in states where legal, intrastate gambling in states where legal

### FinCEN / BSA (Bank Secrecy Act)
- Money transmitter licensing (state-by-state) for crypto-to-fiat rails
- AML/KYC requirements
- Suspicious Activity Reports (SARs) for large transactions

### IRS Tax Reporting
- **W-2G** required for gambling winnings above certain thresholds ($1,200 slots, $5,000 poker, $600+ at 300x odds, etc.)
- **30% withholding** for non-resident aliens
- Players owe income tax on net winnings regardless of platform

---

## 3. US State Law — The Patchwork

Gambling is primarily **state-regulated**. There are three categories of states:

### Category A — Legal iGaming (permit-based)
States with licensed, regulated online gambling:
- **New Jersey** — most developed iGaming market
- **Pennsylvania** — full iGaming legal
- **Michigan** — full iGaming legal
- **Connecticut** — full iGaming legal
- **West Virginia** — full iGaming legal
- **Delaware** — online casino/poker
- **Nevada** — online poker only

Operating in these states requires a state license ($$$, 6-18 months, significant bond requirements).

### Category B — Sweepstakes-friendly states (implicit)
Most states allow sweepstakes/promotional contests that follow specific rules:
- No purchase necessary alternate method of entry (AMOE)
- Prizes awarded by chance among eligible entries
- Odds disclosures, official rules, bond posting (varies)

**Sweepstakes is how Chumba Casino, LuckyLand, Stake.us, and most "crypto casinos" operate in the US.**

### Category C — Prohibited states
Certain states prohibit ALL online gambling/sweepstakes:
- **Washington** — broad online gambling ban (class C felony to operate or play)
- **Idaho** — prohibits most internet gambling
- **Louisiana** — restrictive
- **Hawaii** — no legal gambling at all
- **Utah** — constitutional ban on all gambling
- **New York** — sweepstakes casinos in legal gray zone, enforcement varies

Most operators **geo-block** these states.

---

## 4. The Sweepstakes Model (Path B — Recommended Post-Hackathon)

This is how BlindOracle can operate legally in most of the US **without a gambling license**.

### How It Works

1. Players acquire **two types of currency**:
   - **Gold Coins (GC)** — purchased, play-only, no cash value (enables monetization)
   - **Sweeps Coins (SC)** — distributed for free via AMOE, redeemable for cash prizes (enables sweepstakes play)

2. Key legal hooks:
   - **Purchase is never required** for Sweeps Coins (AMOE: mail-in, social share, etc.)
   - Sweeps Coins are **promotional currency**, not bought
   - Redemption of Sweeps Coins for cash is the "prize" component
   - Gold Coins are just entertainment (no cash redemption)

3. Players use Sweeps Coins in BlindOracle rounds:
   - Entry: 1 SC
   - Winner receives: pot of SC from the match
   - Players can redeem SC for cash at standard rates (e.g., 1 SC = $1)

### Key Requirements

- **No purchase necessary** — clearly advertised AMOE
- **Official rules** with eligibility, odds, start/end dates, prize structure
- **Void where prohibited** — geo-blocked states
- **Bond posting** in some states (FL, NY, RI over certain thresholds)
- **State registration** in some states (FL, NY, RI)
- **Age verification** (21+ in most states for real-prize sweepstakes)
- **Responsible gaming tools** — self-exclusion, deposit limits (good practice, often required)
- **Geo-blocking** of prohibited states (WA, ID, LA, UT, HI, MI for sweepstakes)

### Pros

- US market access without gambling license
- Proven model ($5B+ annual revenue across sweepstakes casinos in US)
- Faster time-to-market than real-money licensing
- Crypto-friendly (Stake.us and others show it works with crypto rails)

### Cons

- Michigan, Connecticut, and others have started cracking down on sweepstakes casinos (2024-2026)
- Must maintain dual-currency architecture (complexity)
- Customer confusion between GC and SC
- Some states (NY, NJ attorneys general) are gearing up enforcement

### Key Precedents

- **Chumba Casino, LuckyLand Slots** (VGW) — market leaders, profitable
- **Stake.us** — crypto-forward sweepstakes model
- **Pulsz, High 5 Casino** — established operators
- **Regulation trend 2025-2026**: increasing state-level pushback, NY AG and MI GCB actions

---

## 5. Offshore Licensing (Path C)

If full real-money play is the goal, offshore licensing becomes necessary.

### Primary Jurisdictions

| Jurisdiction | Cost (est.) | Time | Reputation | Notes |
|-------------|-------------|------|-----------|-------|
| **Curaçao** | $20-40K + annual fees | 2-4 months | Low-mid | Cheapest, fastest, weakest oversight |
| **Malta** | $250K+ | 6-12 months | High | Gold standard in Europe, EU passport |
| **Gibraltar** | $100-200K+ | 6-12 months | High | Respected, UK-affiliated |
| **Isle of Man** | $100-200K+ | 6-12 months | Very high | Strict, prestigious |
| **Kahnawake** (Canada) | $40-80K | 3-6 months | Mid | Popular with North American ops |
| **Anjouan** (Comoros) | $15-25K | 1-2 months | Low | Emerging budget option (2023-2024) |

### Curaçao Reform (2023-2026)

Curaçao restructured its licensing regime in 2023:
- Old **master license / sublicense** model shut down
- New **Curaçao Gaming Control Board (GCB)** direct licenses
- Stricter KYC, AML, player protection requirements
- Applications now take longer, cost more
- Many operators migrated to Anjouan during transition (cheaper, similar model)

### What a License Gets You

- Right to operate online gaming from that jurisdiction
- Payment processor willingness to work with you (partial)
- "Licensed and regulated by X" disclosure on your site
- Contractual basis to serve players in jurisdictions that don't explicitly prohibit

### What a License Does NOT Get You

- **Legal right to serve US players** (offshore license does NOT make US operation legal)
- **Banking access in the US**
- **Ability to advertise to restricted jurisdictions**
- **Protection from US enforcement** (see: Sheldon Adelson's RAWA push, 2014-2019; Kentucky PokerStars seizure, 2011)

### Is Offshore Actually Viable for US Users?

Short answer: **legally murky, practically widespread**.

- Offshore operators routinely serve US players via crypto rails
- Players violate state law in many states, but enforcement is rare
- Operators risk US indictment if they have US nexus (executives, servers, bank accounts)
- Crypto-only operation reduces payment risk but not criminal risk

**Historical examples**:
- **Black Friday (2011)**: DOJ indicted PokerStars, Full Tilt, Absolute Poker — all offshore, seized domains, indicted execs
- **Nevada vs DraftKings DFS (2015)**: cease-and-desist to DraftKings, FanDuel for operating unlicensed
- **Stake.com**: offshore-licensed, **blocks US players**, operates Stake.us separately under sweepstakes model

**The pattern**: successful crypto-gaming operators either (a) operate offshore AND block US, or (b) operate in US under sweepstakes model. Rarely both without separate entities.

---

## 6. Crypto-Specific Complications

BlindOracle settling in NIGHT/crypto adds layers:

### FinCEN Money Transmitter Rules
- **Hosted wallets** that accept third-party funds may trigger MSB (Money Services Business) registration
- **Non-custodial** (where the contract holds funds, not the company) has a stronger defense but isn't bulletproof
- Recent enforcement (Tornado Cash 2022, Samourai Wallet 2024) shows willingness to prosecute

### State Money Transmitter Licensing
- California, New York (BitLicense), most states require per-state licensing
- Non-custodial defense is stronger here, but NY DFS has pursued non-custodial operators
- Cost: $100K-2M+ across all 50 states

### Travel Rule (FinCEN FATF)
- Transactions >$3,000 require originator/beneficiary info exchange
- Crypto transactions may qualify depending on setup

### State Unauthorized Gambling Law + Crypto = Double Exposure
- Running unauthorized gambling in State X via crypto = violation of BOTH gambling law AND potentially money transmitter law
- Prosecutors have charged both in parallel

---

## 7. Practical Recommendations for BlindOracle

### For the Hackathon (Now)

- ✅ **Free-to-play only** — no real entry fees, no cash prizes
- ✅ **Play money / points** — on-chain NIGHT used for stake visualization but not cashable
- ✅ **Clear disclaimer** — "For demonstration only. No real-money gambling."
- ✅ **Geo-blocking** — optional but good practice even for free play
- ✅ **Terms of Service** + **Privacy Policy** on the landing page

### For v1 Launch (3-6 months post-hackathon)

- 🎯 **Sweepstakes model** if US market is the goal
  - Set up dual-currency (GC + SC)
  - Register sweepstakes in required states (FL, NY, RI)
  - Geo-block prohibited states (WA, ID, UT, HI, MI, LA)
  - AMOE published and accessible
  - Age verification (21+)
  - Retain sweepstakes compliance counsel
- 🛡️ **Responsible gaming** — deposit limits, self-exclusion, problem gambling resources (1-800-GAMBLER)
- 🔐 **KYC integration** — via DIDzMonolith/KYCz for identity verification (ZK-preserving)

### For v2 Scale (12+ months)

- 🌍 **Offshore licensing** for markets where sweepstakes isn't viable (EU, Asia, LatAm)
  - Start with Curaçao or Anjouan for low barrier
  - Upgrade to Malta/Gibraltar if scale justifies
- 🚫 **Explicit US block** for real-money product if offshore-only
- 💼 **Separate legal entities** — one for sweepstakes US, one for offshore real-money
- 📊 **Licensed sportsbook integration** — partner with licensed US operators for prediction market verticals

### What NOT to Do

- ❌ Operate real-money play in US without sweepstakes compliance or state licensing
- ❌ Host infrastructure, executives, or bank accounts in US while serving US real-money players from offshore
- ❌ Advertise to restricted jurisdictions (WA, UT, etc.)
- ❌ Assume "crypto = unregulated" — FinCEN and state regulators are very active
- ❌ Use "casino," "gambling," "bet" language in US-facing marketing without licensing (keep "prediction," "game," "contest")

---

## 8. Alternative Framings That May Sidestep Gambling Law

### Sports Prediction Contest (DFS-Style)
- Under UIGEA, fantasy sports is exempt if outcome requires "substantial skill"
- Could frame BlindOracle rounds as prediction contests with skill-based entry
- BUT: requires skill-dominance argument (currently weak for MVP)

### Promotional Raffle / Private Skill Match
- Legal in most states as long as no consideration paid
- Works only for free-play, not monetization

### Tokenized Game Asset (Non-Prize)
- Players accumulate "BLIND tokens" via gameplay, not cash
- Tokens tradeable on secondary markets (player-to-player, not operator-to-player)
- Operator never pays cash prizes directly
- **Risk**: still triggers securities law (is BLIND a security? probably yes under Howey)

### Private Friend Matches
- Peer-to-peer, no house take, no operator involvement in pot
- Arguably not "gambling" since no commercial operator
- But protocol must genuinely be P2P (the contract can't be the counterparty)

---

## 9. Insurance and Risk Management

- **Gaming liability insurance** — requires licensed operation
- **D&O insurance** — expect riders excluding illegal gambling activities
- **Cyber insurance** — for hack/exploit scenarios
- **Regulatory defense coverage** — increasingly important for crypto-gaming

---

## 10. The Pragmatic Take

For a hackathon project with real long-term ambitions:

1. **Ship free-to-play for the hackathon** — no legal exposure, maximum reach, proves the product
2. **Collect a waitlist** of interested players across jurisdictions
3. **Validate the product thesis** (do people actually enjoy commit-reveal gameplay?)
4. **If validated**, raise funding specifically earmarked for:
   - Gaming counsel ($50-150K)
   - Sweepstakes setup ($100-300K)
   - OR offshore licensing ($50-500K depending on jurisdiction)
5. **Make the legal architecture match the revenue model**, not the other way around

**Do not let gambling law shape the MVP**. Let it shape v1.

---

## 11. Resources & Further Reading

- [American Gaming Association — Responsible Gaming Guide](https://www.americangaming.org)
- [Nevada Gaming Control Board Regulations](https://gaming.nv.gov)
- [Sweepstakes Casino Legal Overview — 2025](https://www.gamblinglaws.org)
- [UIGEA Full Text — 31 U.S.C. §§ 5361-5367](https://www.law.cornell.edu/uscode/text/31/chapter-53/subchapter-IV)
- [FinCEN Virtual Currency Guidance (2019)](https://www.fincen.gov/sites/default/files/2019-05/FinCEN%20Guidance%20CVC%20FINAL%20508.pdf)
- [Malta Gaming Authority](https://www.mga.org.mt)
- [Curaçao Gaming Control Board](https://www.gaming-curacao.com)

---

## 12. Decision Matrix — For John

**Question**: Should BlindOracle launch US-facing or go offshore?

| Scenario | Recommendation |
|----------|----------------|
| Hackathon demo + showcase only | **Free-to-play, no licensing needed** |
| Want US revenue, risk-averse | **Sweepstakes model (like Stake.us, Chumba)** |
| Want EU/global revenue, medium risk | **Malta or Gibraltar offshore license** |
| Want max revenue, high risk tolerance, crypto-native audience | **Curaçao + explicit US block** |
| Want to skip US entirely, serve crypto-native global | **Anjouan or Curaçao, geo-block US** |

**My (Penny's) recommendation**: Start free-to-play for the hackathon and the 6 months after. If the game gains traction, pursue **sweepstakes model for US** + **Curaçao/Anjouan for rest-of-world** as parallel v1 products. This is the pattern Stake, Chumba, and others have proven viable.

**Do not** try to operate real-money play in US without proper state licensing or sweepstakes compliance — the penalty structure (RICO, wire fraud, UIGEA) is not worth the revenue.
