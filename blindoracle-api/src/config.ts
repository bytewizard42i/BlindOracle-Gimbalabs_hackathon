/**
 * BlindOracle — Runtime Configuration
 *
 * Default per-environment configs. The UI loads a live config from
 * `public/config.json` at startup which can override these defaults.
 */

import type { RuntimeConfig, RoundConfig } from './common-types.js';
import { GodWindowMode } from './common-types.js';

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

/**
 * Default MVP round configuration — the hackathon baseline.
 * Range 1-10, 2-player fixed stake, 5 min entry window, opt-in God Window.
 */
export const DEFAULT_ROUND_CONFIG: RoundConfig = {
  secretMin: 1,
  secretMax: 10,
  guessMin: 1,
  guessMax: 10,
  stakeAmount: 1_000_000n, // 1 NIGHT (assuming 6 decimals)
  minPlayers: 2,
  maxPlayers: 20,
  entryWindowSeconds: 300,
  protocolFeeBps: 200, // 2%
  godWindow: GodWindowMode.OptIn,
};

/** Hackathon demo config — wider range, smaller stake, fast rounds, full reveal for showcase */
export const DEMO_ROUND_CONFIG: RoundConfig = {
  secretMin: 1,
  secretMax: 20,
  guessMin: 1,
  guessMax: 20,
  stakeAmount: 100_000n, // 0.1 NIGHT
  minPlayers: 2,
  maxPlayers: 12,
  entryWindowSeconds: 120,
  protocolFeeBps: 0, // free-play for hackathon demo
  godWindow: GodWindowMode.FullReveal,
};
