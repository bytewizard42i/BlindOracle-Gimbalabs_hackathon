/**
 * BlindOracle — Runtime & Round Configuration Defaults
 *
 * The UI loads a live config from `public/config.json` at startup which
 * can override these defaults per-environment.
 */

import type { RoundConfig, RuntimeConfig } from './common-types.js';
import { GodWindowMode } from './common-types.js';

// ============================================================================
// Network Configs
// ============================================================================

export const UNDEPLOYED_CONFIG: RuntimeConfig = {
  networkId: 'undeployed',
  proofServerUrl: 'http://localhost:6300',
  indexerUrl: 'http://localhost:8088/api/v1/graphql',
  indexerWsUrl: 'ws://localhost:8088/api/v1/graphql/ws',
  nodeUrl: 'ws://localhost:9944',
  contractAddress: null,
};

export const TESTNET_CONFIG: RuntimeConfig = {
  networkId: 'testnet',
  proofServerUrl: 'https://proof-server.testnet.midnight.network',
  indexerUrl: 'https://indexer.testnet.midnight.network/api/v1/graphql',
  indexerWsUrl: 'wss://indexer.testnet.midnight.network/api/v1/graphql/ws',
  nodeUrl: 'wss://rpc.testnet-02.midnight.network',
  contractAddress: null,
  faucetUrl: 'https://faucet.testnet-02.midnight.network',
};

export const MAINNET_CONFIG: RuntimeConfig = {
  networkId: 'mainnet',
  proofServerUrl: 'https://proof-server.midnight.network',
  indexerUrl: 'https://indexer.midnight.network/api/v1/graphql',
  indexerWsUrl: 'wss://indexer.midnight.network/api/v1/graphql/ws',
  nodeUrl: 'wss://rpc.midnight.network',
  contractAddress: null,
};

// ============================================================================
// Round Configs
// ============================================================================

/**
 * MVP hackathon demo config.
 *
 * Design rationale:
 *   - Range 1-10 + maxGuessesPerNumber=3 → max 30 players (10*3).
 *     Keeps each round compact and shippable.
 *   - minPlayers=2 so the contract actually progresses with low turnout.
 *   - 2-minute entry window (off-chain, enforced by owner).
 *   - Zero protocol fee → free-play showcase, no gambling concerns.
 *   - Full God Window reveal for maximum demo drama.
 */
export const DEMO_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64), // placeholder, set at deployment
  stakeAmount: 0n, // free-play for hackathon
  minPlayers: 2,
  maxPlayers: 30,
  maxGuessesPerNumber: 3,
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 0,
  godWindow: GodWindowMode.FullReveal,
  entryWindowSeconds: 120,
};

/**
 * Standard production round config.
 *
 * Design rationale:
 *   - Range 1-10 + maxGuessesPerNumber=5 → max 50 players.
 *   - minPlayers=4 so there are real stakes (at least 2 pairings).
 *   - 5-minute entry window.
 *   - 2% protocol fee.
 *   - Opt-in God Window.
 */
export const STANDARD_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64),
  stakeAmount: 1_000_000n, // 1 NIGHT (assuming 6 decimals)
  minPlayers: 4,
  maxPlayers: 50,
  maxGuessesPerNumber: 5,
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 200,
  godWindow: GodWindowMode.OptIn,
  entryWindowSeconds: 300,
};

/**
 * High-stakes tournament config.
 *
 * Design rationale:
 *   - Wider range (1-20) + tighter cap (2 per number) = 40 players max.
 *   - Forces more strategic thinking (more numbers to consider).
 *   - Higher min (6) so every round has meaningful action.
 *   - Disabled God Window — secrets stay secret forever.
 */
export const TOURNAMENT_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64),
  stakeAmount: 10_000_000n, // 10 NIGHT
  minPlayers: 6,
  maxPlayers: 40,
  maxGuessesPerNumber: 2,
  guessMin: 1,
  guessMax: 20,
  protocolFeeBps: 300,
  godWindow: GodWindowMode.Disabled,
  entryWindowSeconds: 600,
};

/**
 * Compute the theoretical maximum players a round can hold, given the
 * anti-crowd cap. Useful for UI sanity-checks.
 */
export function theoreticalMaxPlayers(config: RoundConfig): number {
  const range = config.guessMax - config.guessMin + 1;
  return Math.min(config.maxPlayers, range * config.maxGuessesPerNumber);
}
