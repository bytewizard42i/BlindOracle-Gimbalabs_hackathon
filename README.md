<div align="center">

```
 ██████╗ ██╗     ██╗███╗   ██╗██████╗      ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗
 ██╔══██╗██║     ██║████╗  ██║██╔══██╗    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝
 ██████╔╝██║     ██║██╔██╗ ██║██║  ██║    ██║   ██║██████╔╝███████║██║     ██║     █████╗
 ██╔══██╗██║     ██║██║╚██╗██║██║  ██║    ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝
 ██████╔╝███████╗██║██║ ╚████║██████╔╝    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗
 ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═════╝      ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝
```

### *Truth exists. Visibility is optional.*

**A privacy-preserving prediction game on the Midnight Network.**
Built for the **Gimbalabs Hackathon 2026**.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=for-the-badge)](./LICENSE)
[![Midnight](https://img.shields.io/badge/Midnight-Network-9d4edd?style=for-the-badge)](https://midnight.network)
[![Compact](https://img.shields.io/badge/Compact-v0.30.0-ffd60a?style=for-the-badge)](https://docs.midnight.network)
[![Status](https://img.shields.io/badge/status-scaffolded-ff6b6b?style=for-the-badge)]()

</div>

---

## 🔮 What Is This?

> *"Most games create trust by showing everything. BlindOracle creates trust by proving enough."*

**BlindOracle** is a Midnight-native DApp where players commit a hidden secret, guess blindly at an unknown opponent, and settle through zero-knowledge proofs. You never see your opponent's card. You never see anyone's card. Yet you can prove — cryptographically — that the outcome was fair.

This isn't a casino game wearing a crypto skin.
It's a **demonstration of what becomes possible when privacy is a protocol feature**, not an afterthought.

---

## 🎭 The Four Acts of a Round

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ACT I     │ ──▶ │   ACT II    │ ──▶ │   ACT III   │ ──▶ │   ACT IV    │
│  COMMIT     │     │    LOCK     │     │    MATCH    │     │   SETTLE    │
│             │     │             │     │             │     │             │
│ 🔐 Secrets  │     │ 🔒 Door     │     │ ⚖️ Fate     │     │ 👁️ Truth   │
│   sealed    │     │   closes    │     │   decides   │     │   judged    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Act I — **COMMIT** 🔐

You choose a secret number. You submit a guess for what your future opponent might choose. Both values are hashed into hiding commitments and written to the chain. **Nobody — not us, not other players, not even the chain itself — can see your raw values.**

### Act II — **LOCK** 🔒

The entry window closes. No more players. No more changes. Every commitment is now permanent, non-malleable, and provably pre-dated to the matching phase.

### Act III — **MATCH** ⚖️

Deterministic randomness — derived from the set of locked commitments themselves — pairs each player with exactly one opponent. **You couldn't have known who you'd face when you chose your secret. Neither could they.**

### Act IV — **SETTLE** 👁️

For each pair, the oracle asks one question: *did A guess B's secret? did B guess A's secret?* Payouts flow. Proofs are issued. Each player learns **only what they need to know** to verify the outcome.

---

## 🌙 Why Midnight?

BlindOracle is not merely built **on** Midnight. It **only makes sense because of** Midnight.

| Other chains | Midnight |
|---|---|
| Public state leaks information | **Hidden state is the gameplay** |
| Trust requires full transparency | **Trust comes from ZK proofs** |
| Privacy is a bolt-on | **Privacy is the protocol** |
| Reveals happen automatically | **You control what gets revealed, when, and to whom** |

If everything were public, the tension disappears.
If nothing could be proven, trust disappears.
**Midnight lets this game exist in the exact middle — and the middle is the product.**

---

## 🌟 The God Window

> *"The oracle knows. You do not. Not yet."*

After settlement, an optional **God Window** can reveal the actual hidden values. It's the emotional climax — the moment secrecy ends and truth becomes visible. But only **after** fairness has already been cryptographically guaranteed.

**Four modes:**

- 🚫 **Disabled** — pure privacy, outcome-only
- 🙋 **Opt-In** — each player chooses whether to reveal their own values
- 📖 **Full Reveal** — all secrets shown (configured at round creation)
- ⏰ **Delayed** — secrets revealed after a time delay (sealed-envelope effect)

See [`docs/GOD_WINDOW.md`](./docs/GOD_WINDOW.md) for the full design.

---

## 🏛️ Architecture at a Glance

```
                 ┌─────────────────────────────────┐
                 │     BlindOracle Monorepo        │
                 ├─────────────────────────────────┤
                 │                                 │
     🧠 Logic    │  blindoracle-contract/          │  Compact + TS bindings
                 │    └─ compact/blind-oracle.compact
                 │                                 │
     🔌 Types    │  blindoracle-api/               │  Shared SDK surface
                 │    ├─ common-types.ts           │
                 │    ├─ game-logic.ts             │
                 │    └─ config.ts                 │
                 │                                 │
     🎨 UI       │  blindoracle-ui/                │  React + Vite + MUI
                 │    ├─ src/App.tsx               │
                 │    └─ src/main.tsx              │
                 │                                 │
                 └────────────┬────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌────────────┐   ┌──────────────┐   ┌──────────┐
     │ Proof      │   │  Indexer     │   │ Midnight │
     │ Server     │   │              │   │ Node     │
     │ :6300      │   │  :8088       │   │ :9944    │
     └────────────┘   └──────────────┘   └──────────┘
```

Full architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

---

## ⚡ Quick Start

```bash
# 1. Prerequisites
#    - Node 22+
#    - Yarn 4+ (via `corepack enable`)
#    - Docker (for local Midnight stack)
#    - Compact compiler v0.30.0 (`compact update 0.30`)

# 2. Install
nvm use
corepack enable
yarn install

# 3. Boot the local Midnight stack
docker compose -f undeployed-compose.yml up -d

# 4. Compile the Compact contract
yarn compact

# 5. Run dev servers
yarn dev
```

Open **http://localhost:5177** and behold the oracle.

---

## 🎨 Design DNA

BlindOracle is **dark, premium, elegant, and intentionally mysterious**. Not cartoonish. Not another neon casino. Think: Hades meets Monument Valley meets the Delphic oracle.

- **Palette**: deep violet (#9d4edd) + oracle gold (#ffd60a) on near-black (#0a0a14)
- **Typography**: Cinzel (display) + Inter (body) — mythic yet readable
- **Motion**: slow, deliberate reveals; numbers appear one at a time
- **Sound** (future): ambient mystery bed, bass hit on God Window reveal

---

## 📚 Documentation

| Document | What's inside |
|----------|---------------|
| [`README.md`](./README.md) | You are here |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Full deployment guide (local → testnet → mainnet) |
| [`docs/MECHANICS.md`](./docs/MECHANICS.md) | **Authoritative protocol mechanics, vocabulary, state machine** |
| [`docs/RULES_MVP.md`](./docs/RULES_MVP.md) | MVP rulebook with scoring, anti-crowd cap, min-player gating |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Contract / SDK / UI layers + privacy model |
| [`docs/PITCH.md`](./docs/PITCH.md) | Hackathon pitch, market fit, taglines |
| [`docs/GOD_WINDOW.md`](./docs/GOD_WINDOW.md) | Post-settlement reveal design |
| [`docs/GAMBLING_COMPLIANCE.md`](./docs/GAMBLING_COMPLIANCE.md) | US vs offshore legal analysis, sweepstakes strategy |
| [`docs/WHAT_YOURE_NOT_THINKING_ABOUT.md`](./docs/WHAT_YOURE_NOT_THINKING_ABOUT.md) | Blind spots with **real solutions** for every problem |
| [`FUTURE_FUNCTIONALITY.md`](./FUTURE_FUNCTIONALITY.md) | Expansion roadmap beyond MVP |

---

## 🧙 Taglines

Choose your weapon:

- *Truth exists. Visibility is optional.*
- *Guess in the dark. Settle in certainty.*
- *Hidden choices. Provable outcomes.*
- *The oracle knows. You do not. Not yet.*
- *What is hidden can still be judged.*
- *Locked secrets. Verified fate.*

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| Smart Contracts | **Compact v0.30.0** (pragma `>= 0.16 && <= 0.21`) |
| SDK | **TypeScript 5.7** + **@midnight-ntwrk/midnight-js v3.1.0** |
| Frontend | **React 18** + **Vite 6** + **Material-UI 6** |
| Monorepo | **Turborepo 2** + **Yarn 4 workspaces** |
| Wallet | **Lace** (Midnight browser wallet) |
| Privacy | **ZK-SNARKs** via Midnight proof server |

</div>

---

## 🌌 Part of the DIDzMonolith Ecosystem

BlindOracle is one star in a constellation of privacy-preserving DApps:

- 🎴 **[proofOrBluff](https://github.com/bytewizard42i/proofOrBluff)** — sibling card game, "Bluff in public. Prove in private."
- 🔐 **[DIDz.io](https://github.com/bytewizard42i/DIDz-io)** — decentralized identity engine
- 🏥 **[safeHealthData](https://github.com/bytewizard42i/safeHealthData)** — private health records
- 🐎 **[equineProData](https://github.com/bytewizard42i/equineProData)** — privacy + RWA for horses
- 🗳️ **[realVote](https://github.com/bytewizard42i/realVote)** — private voting
- 🔬 **[sharedScience](https://github.com/bytewizard42i/sharedScience_me)** — ZK scientific collaboration

All powered by the **Midnight Network** — privacy as a primitive, not a feature.

---

## 👤 Author

**John Santi** ([@bytewizard42i](https://github.com/bytewizard42i))

- 🌙 **Midnight NightForce Bravo**
- 🎖️ **Midnight Ambassador**
- 🎓 **Midnight Academy Triple Certified**
- 🪙 **Cardano Certified Blockchain Associate**
- 💼 **Emurgo Certified Blockchain Business Consultant**

Built in collaboration with **Penny** 🎀 — his WSL-based Ai pair programmer.

---

## 📜 License

**Apache 2.0** — see [`LICENSE`](./LICENSE). Use it, remix it, fork it, ship it.

---

<div align="center">

### *"In the dark, truth still waits."*

⬛ ⬛ ⬛

**[▶ Enter a Round](#)** · **[📖 Read the Docs](./docs)** · **[🐛 Report a Bug](https://github.com/bytewizard42i/BlindOracle-Gimbalabs_hackathon/issues)**

</div>
