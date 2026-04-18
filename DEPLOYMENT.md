# BlindOracle — Deployment Guide

## Product Role

BlindOracle is a privacy-preserving prediction game on the Midnight Network. Players commit hidden values, guess blindly, and settle outcomes through ZK proofs. It showcases Midnight's selective privacy in an interactive, emotionally engaging format.

**Hackathon**: Gimbalabs Hackathon
**License**: Apache 2.0

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    BlindOracle DApp                       │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ blindoracle-  │  │ blindoracle- │  │ blindoracle-   │ │
│  │ ui (React)    │  │ api (SDK)    │  │ contract       │ │
│  │ Port: 5177    │  │ Types/Logic  │  │ (Compact)      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘ │
│         │                  │                  │           │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
        │ Proof      │ │ Indexer   │ │ Midnight  │
        │ Server     │ │           │ │ Node      │
        │ :6300      │ │ :8088     │ │ :9944     │
        └────────────┘ └───────────┘ └───────────┘
```

## Repo Layout

| Workspace | Purpose |
|-----------|---------|
| `blindoracle-contract/` | Compact smart contracts — round management, commitments, matching, settlement |
| `blindoracle-api/` | Shared TypeScript types, game logic helpers, runtime config, SDK surface |
| `blindoracle-ui/` | React + Vite frontend — game lobby, commitment UX, reveal/God Window |

## SDK Versions

Pinned to `midnightntwrk/example-zkloan` latest stable:

| Package | Version |
|---------|---------|
| `@midnight-ntwrk/compact-runtime` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-contracts` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-types` | 3.1.0 |
| `@midnight-ntwrk/midnight-js-network-id` | 2.1.0 |
| `@midnight-ntwrk/ledger` | 3.1.0 |

## Local Development

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- Yarn 4+ (`corepack enable`)
- Compact compiler v0.30.0 (`compact update 0.30`)
- Docker (for local Midnight stack)

### Setup

```bash
nvm use
corepack enable
yarn install
```

### Local Midnight Stack

```bash
docker compose -f undeployed-compose.yml up -d
```

### Dev Servers

```bash
yarn dev           # Starts UI dev server + watchers
yarn compact       # Compile .compact → managed bindings
yarn build         # Full build
yarn test          # Run all tests
```

## Environments

| Environment | Network | Proof Server | Indexer |
|-------------|---------|-------------|---------|
| **Undeployed** (local) | `undeployed` | `http://localhost:6300` | `http://localhost:8088` |
| **TestNet** | `testnet` | Midnight-provided | Midnight-provided |
| **MainNet** | `mainnet` | Midnight-provided | Midnight-provided |

## Frontend Deployment

**Target**: Vercel (recommended) or Netlify

```bash
cd blindoracle-ui
yarn build
# Deploy dist/ to hosting provider
```

Environment variables injected via `public/config.json` override at deploy time.

## Phase Roadmap

### Phase 0 — Hackathon MVP
- Single-round secret number game (range 1-10)
- Commit + guess + match + settle flow
- Simple winner-takes-match payout
- Basic React UI with wallet connect
- God Window (optional post-settlement reveal)

### Phase 1 — Polish
- Epoch-based recurring rounds
- Shared pool distribution mode
- Player history and stats
- Result proof receipts

### Phase 2 — Social
- Spectator mode
- Leaderboards
- Tournament brackets
- Custom community rooms

### Phase 3 — Protocol Extension
- Multi-stage hidden logic
- Team mode
- Ai oracle solo play
- Sealed-bid auction variant
- Private polling variant

## Known Constraints

- **Randomness**: Fair pairing requires an auditable entropy source — witness-provided randomness with commitment scheme
- **Skylake+ CPU**: ZK proof generation requires 6th gen Intel or newer (Chuck's Haswell i7-4770 cannot run zkir)
- **Round latency**: Settlement waits for all commitments to lock — round duration is a UX tradeoff
- **Wagering**: Real-money payout modes may trigger regulatory considerations — launch with points-based play first
