/**
 * BlindOracle — Runtime & Round Configuration (v3, pooled)
 */

import type { RoundConfig, RuntimeConfig } from './common-types.js';
import { GodModeMode } from './common-types.js';

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
 * Demo config — hackathon showcase, free-play.
 *
 * Pool math:
 *   3 pools × 4 min real players = 12 real players minimum for round to start
 *   3 pools × 8 max real players = 24 real players total capacity
 *   Each pool seeds 6 bots (pure UI fiction)
 *   Cap: 2 guesses per number per pool (range 1-10) = 3 × 10 × 2 = 60 theoretical max
 *
 * Fee: 0% for demo (no gambling concerns). Production uses 10% (STANDARD_ROUND_CONFIG).
 */
export const DEMO_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64),
  stakeAmount: 0n,
  poolCount: 3,
  poolMinRealPlayers: 4,
  poolMaxRealPlayers: 8,
  poolBotSeedCount: 6,
  maxGuessesPerNumber: 2,
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 0,
  godMode: GodModeMode.FullReveal,
  entryWindowSeconds: 120,
};

/**
 * Standard production config — 10% house fee, real stakes.
 *
 * Pool math:
 *   3 pools × 4 min = 12 minimum
 *   3 pools × 10 max = 30 total capacity
 *   Each pool seeds 10 bots
 *   Cap: 3 guesses per number per pool (range 1-10) = 3 × 10 × 3 = 90 theoretical
 */
export const STANDARD_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64),
  stakeAmount: 1_000_000n,
  poolCount: 3,
  poolMinRealPlayers: 4,
  poolMaxRealPlayers: 10,
  poolBotSeedCount: 10,
  maxGuessesPerNumber: 3,
  guessMin: 1,
  guessMax: 10,
  protocolFeeBps: 1000, // 10%
  godMode: GodModeMode.OptIn,
  entryWindowSeconds: 300,
};

/**
 * High-stakes tournament — tighter caps, wider range.
 *
 * Pool math:
 *   3 pools × 6 min = 18 minimum
 *   3 pools × 12 max = 36 total capacity
 *   Bots: 0 (tournaments don't need the illusion)
 *   Cap: 2 per (pool, guess) (range 1-20) = 3 × 20 × 2 = 120 theoretical
 */
export const TOURNAMENT_ROUND_CONFIG: RoundConfig = {
  owner: '0x' + '0'.repeat(64),
  stakeAmount: 10_000_000n,
  poolCount: 3,
  poolMinRealPlayers: 6,
  poolMaxRealPlayers: 12,
  poolBotSeedCount: 0,
  maxGuessesPerNumber: 2,
  guessMin: 1,
  guessMax: 20,
  protocolFeeBps: 1000,
  godMode: GodModeMode.Disabled,
  entryWindowSeconds: 600,
};

/** Theoretical maximum real players across all pools. */
export function theoreticalMaxPlayers(config: RoundConfig): number {
  const perPoolCap = Math.min(
    config.poolMaxRealPlayers,
    (config.guessMax - config.guessMin + 1) * config.maxGuessesPerNumber,
  );
  return config.poolCount * perPoolCap;
}
