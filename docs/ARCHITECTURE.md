# BlindOracle — Technical Architecture

## System Overview

BlindOracle is a Midnight-native DApp composed of three workspaces orchestrated by Turborepo. The system uses Compact smart contracts for on-chain game state and commitments, a TypeScript SDK layer for shared types and game logic, and a React frontend for player interaction.

---

## Contract Layer (`blindoracle-contract/`)

### Smart Contract: `blind-oracle.compact`

The Compact contract manages on-chain state for:

1. **Round lifecycle** — open, locked, settled states
2. **Player commitments** — hashed secrets and guesses stored on ledger
3. **Match results** — pairing assignments and settlement outcomes
4. **Stake management** — entry fees and payout distribution

### Key Ledger State

```
ledger roundState: Uint<0..3>          // 0=open, 1=locked, 2=settling, 3=settled
ledger roundId: Counter                 // Monotonic round counter
ledger commitments: Map<Bytes<32>, Bytes<32>>  // playerPk → commitment hash
ledger guessCommitments: Map<Bytes<32>, Bytes<32>>  // playerPk → guess commitment
ledger playerCount: Counter             // Active players in current round
ledger totalStake: Counter              // Sum of all stakes in current round
ledger protocolFee: Uint<64>            // Fee percentage (basis points)
```

### Key Circuits

| Circuit | Purpose |
|---------|---------|
| `enter_round` | Player commits secret + guess hashes, pays stake |
| `lock_round` | Transitions round from open → locked (time/count trigger) |
| `submit_match_result` | Oracle submits pairing + result for a matched pair |
| `settle_round` | Finalizes payouts, transitions to settled |
| `reveal_for_god_window` | Optional: publishes raw values post-settlement |

### Witness Functions

| Witness | Purpose |
|---------|---------|
| `local_secret_key()` | Player's wallet signing key |
| `get_secret_number()` | Player's chosen secret value |
| `get_guess_number()` | Player's chosen guess value |
| `get_match_entropy()` | Randomness seed for fair pairing |
| `get_round_timestamp()` | Current timestamp for round timing |

### Commitment Scheme

```
commitment = persistentCommit(secret_number)
guess_commitment = persistentCommit(guess_number)
```

The `persistentCommit` function creates a hiding commitment — the value is locked but not revealed until the prover chooses to disclose it.

---

## SDK Layer (`blindoracle-api/`)

### Shared Types (`common-types.ts`)

- `RoundPhase` — enum: Open, Locked, Settling, Settled
- `PlayerCommitment` — secret hash + guess hash + player public key
- `MatchPair` — two player PKs paired for scoring
- `MatchResult` — outcome for a pair (A wins, B wins, split, draw)
- `RoundConfig` — parameters (range, stake, duration, max players, fee)
- `RoundSummary` — final state including results and optional reveals
- `GodWindowData` — revealed secrets/guesses for post-settlement display

### Game Logic (`game-logic.ts`)

- `generateCommitment(secret, salt)` — creates commitment hash
- `verifyCommitment(commitment, secret, salt)` — checks a revealed value
- `computeMatchPairs(playerPKs, entropy)` — deterministic fair pairing
- `scoreMatch(guessA, secretB, guessB, secretA)` — returns MatchResult
- `calculatePayout(result, stakePerPlayer, feeRate)` — payout amounts

### Config (`config.ts`)

Runtime configuration per environment (undeployed, testnet, mainnet) with proof server, indexer, and contract addresses.

---

## Frontend Layer (`blindoracle-ui/`)

### Stack

- **React 18** + TypeScript
- **Vite** for dev/build
- **Material-UI** for components
- **Lace wallet** integration (Midnight's browser wallet)

### Key Components (Planned)

| Component | Purpose |
|-----------|---------|
| `WalletConnect` | Connect Lace wallet, show balance |
| `RoundLobby` | View current round status, player count, countdown |
| `CommitForm` | Choose secret number + guess, submit commitment |
| `WaitingRoom` | Post-commit waiting for round lock |
| `ResultScreen` | Win/lose/draw display with proof receipt |
| `GodWindow` | Optional reveal of all secrets after settlement |
| `RoundHistory` | Past rounds and personal stats |

### UX Flow

```
Landing → Connect Wallet → Round Lobby → Commit (Secret + Guess)
→ Waiting Room → Round Locks → Settlement → Result Screen
                                              ↓ (optional)
                                          God Window
```

### Design Direction

- **Dark, premium, elegant** — not cartoonish
- **Mysterious tone** — hidden truth, sealed fate
- **Minimal data shown during play** — suspense is the product
- **Clear structure underneath** — results screen is crystal clear

---

## Privacy Architecture

### What Is Hidden

| Data | During Play | After Settlement | God Window |
|------|------------|-----------------|------------|
| Player's secret number | Hidden | Hidden | Revealed |
| Player's guess | Hidden | Hidden | Revealed |
| Commitment hashes | Public (on ledger) | Public | Public |
| Match pairing | Hidden until lock | Public | Public |
| Win/loss result | Hidden | Public (per player) | Public |
| Opponent's secret | Hidden | Hidden | Revealed |

### Midnight Privacy Features Used

- **`persistentCommit`** — hiding commitments for secrets and guesses
- **`persistentHash`** — deterministic hashing for pairing entropy
- **`disclose()`** — controlled revelation in circuit conditionals
- **Sealed ledger fields** — round state visible, raw values hidden
- **Witness functions** — private inputs stay in the prover

---

## Randomness / Fair Pairing

Fair pairing is a critical trust component. The approach:

1. After all commitments lock, collect all commitment hashes
2. Derive pairing entropy: `entropy = persistentHash(all_commitment_hashes_concatenated)`
3. Use entropy to deterministically shuffle and pair players
4. The pairing is auditable: anyone with the commitment hashes can reproduce it
5. No single player can predict or manipulate their opponent assignment

This is **deterministic randomness from committed data** — predictable enough for verification, unpredictable enough for fairness (because individual secrets are hidden).

---

## Contract Deployment Flow

```
1. Compile:   compact compile compact/blind-oracle.compact
2. Generate:  Compact compiler → managed/ bindings (TS types + deploy helpers)
3. Deploy:    Use @midnight-ntwrk/midnight-js-contracts to deploy to network
4. Connect:   UI loads contract address from config.json
5. Interact:  Players call circuits via wallet + proof server
```

---

## Infrastructure

### Local Development Stack

Via `undeployed-compose.yml`:

| Service | Port | Purpose |
|---------|------|---------|
| Proof Server | 6300 | ZK proof generation |
| Indexer | 8088 | Ledger state queries |
| Midnight Node | 9944 | Block production |

### Production

- **Frontend**: Vercel / Netlify (static deploy of `blindoracle-ui/dist`)
- **Contract**: Deployed to Midnight TestNet/MainNet
- **No backend server needed** — the contract + indexer + proof server handle all game logic
