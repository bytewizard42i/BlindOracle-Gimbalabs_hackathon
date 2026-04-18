# BlindOracle

**Truth exists. Visibility is optional.**

A privacy-preserving prediction game built on the [Midnight Network](https://midnight.network). Players commit hidden values, submit blind guesses, and settle outcomes fairly through zero-knowledge proofs — without exposing more information than necessary.

Built for the **Gimbalabs Hackathon** by [John Santi](https://github.com/bytewizard42i).

---

## What Is BlindOracle?

BlindOracle is a Midnight-native DApp that turns hidden information into gameplay. Each player:

1. **Commits** a secret number (privately, on-chain)
2. **Guesses** what their future opponent's secret might be
3. **Waits** for the round to close and lock all entries
4. **Gets matched** with a random opponent after lock
5. **Settles** — the protocol checks guesses against secrets and distributes rewards
6. **Receives proof** of the outcome without seeing everyone's private state

An optional **God Window** can reveal the actual hidden values after settlement for spectators, replay, or educational purposes.

## Why Midnight?

Most games create trust by showing everything. BlindOracle creates trust by **proving enough**.

- **Hidden state matters** — secrecy is the gameplay, not a bug
- **Fairness without full exposure** — ZK proofs guarantee correct settlement
- **Selective disclosure** — players learn only what the mode allows
- **Provable commitments** — nobody can change their secret after locking

This is something that only truly makes sense **because of** Midnight's selective privacy model.

## Monorepo Structure

```
BlindOracle-Gimbalabs_hackathon/
├── blindoracle-contract/   # Compact smart contracts + TS bindings
├── blindoracle-api/        # Shared types, game logic, SDK helpers
├── blindoracle-ui/         # React + Vite frontend
├── docs/                   # Architecture, rules, pitch, God Window
├── DEPLOYMENT.md           # Full deployment guide
├── FUTURE_FUNCTIONALITY.md # Expansion roadmap
└── LICENSE                 # Apache 2.0
```

## Quick Start

```bash
# Prerequisites: Node 22+, Yarn 4+, Compact compiler v0.30.0
nvm use
corepack enable
yarn install

# Compile Compact contracts
yarn compact

# Build all workspaces
yarn build

# Start dev servers (UI + API)
yarn dev
```

## Pinned SDK Versions

| Package | Version |
|---------|---------|
| `@midnight-ntwrk/compact-runtime` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-contracts` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-types` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-network-id` | 2.1.0 |
| `@midnight-ntwrk/ledger` | 3.1.0 |
| `@midnight-ntwrk/wallet` | 3.1.0 |
| `@midnight-ntwrk/zswap` | 3.1.0 |

SDK versions pinned to match `midnightntwrk/example-zkloan` — the latest stable reference DApp.

## Compact Compiler

- **Compiler**: compactc v0.30.0
- **Devtools**: compact v0.5.1
- **Language pragma**: `>= 0.16 && <= 0.21`

## Ecosystem

BlindOracle is part of the [DIDzMonolith](https://github.com/bytewizard42i) ecosystem — a family of privacy-preserving DApps on Midnight.

## Author

**John Santi**
- Midnight NightForce Bravo
- Midnight Ambassador
- Midnight Academy Triple Certified
- Cardano Certified Blockchain Associate
- Emurgo Certified Blockchain Business Consultant

## License

Apache 2.0 — see [LICENSE](./LICENSE).
