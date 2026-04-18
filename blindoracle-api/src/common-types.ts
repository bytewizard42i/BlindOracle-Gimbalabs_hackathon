/**
 * BlindOracle — Shared TypeScript Types (v3, pooled)
 *
 * Mirrors the on-chain Compact contract. Consumed by UI, tests, and any
 * external integrations.
 *
 * CRITICAL VOCABULARY (do not conflate):
 *
 *   answer  — The number a player LOCKS IN for OTHER players to try to guess.
 *             PRIVATE. Stored only as a hiding commitment on-chain.
 *             NEVER capacity-capped.
 *
 *   guess   — The number a player is BETTING their opponent's answer will be.
 *             PUBLIC at commit time. Stored directly on-chain.
 *             CAPACITY-CAPPED per pool (maxGuessesPerNumber).
 */

// ============================================================================
// Pool
// ============================================================================

/** A pool identifier (0-indexed, up to poolCount-1). */
export type PoolId = number;

/** Per-pool runtime state. */
export interface PoolState {
  readonly poolId: PoolId;
  readonly realPlayerCount: number;
  readonly isReady: boolean;
  /** Off-chain bot count shown in UI (not on-chain). */
  readonly displayBotCount: number;
  /** Per-(pool, guess) capacity map. */
  readonly guessBucketCounts: ReadonlyMap<number, number>;
}

// ============================================================================
// Round Lifecycle
// ============================================================================

export enum RoundPhase {
  /** One or more pools below poolMinRealPlayers. */
  Forming = 0,
  /** All pools at or above min; still accepting entries up to per-pool max. */
  Open = 1,
  /** No more entries; matching in progress. */
  Locked = 2,
  /** Match results being submitted per pair. */
  Settling = 3,
  /** All payouts assigned; round complete. */
  Settled = 4,
  /** Round aborted from Forming; refunds claimable. */
  Aborted = 5,
}

export const TERMINAL_PHASES: readonly RoundPhase[] = [
  RoundPhase.Settled,
  RoundPhase.Aborted,
];

export const ENTRY_PHASES: readonly RoundPhase[] = [
  RoundPhase.Forming,
  RoundPhase.Open,
];

// ============================================================================
// Round Configuration
// ============================================================================

export interface RoundConfig {
  /** Owner's public key (hex). */
  readonly owner: string;

  /** Stake per player (NIGHT base units). */
  readonly stakeAmount: bigint;

  /** Number of pools (default 3). */
  readonly poolCount: number;

  /** Per-pool minimum real players to trigger pool readiness. */
  readonly poolMinRealPlayers: number;

  /** Per-pool maximum real players. */
  readonly poolMaxRealPlayers: number;

  /** Per-pool bot seed count (UI fiction, displayed but not on-chain). */
  readonly poolBotSeedCount: number;

  /** Anti-crowd cap per (pool, guess) combo. */
  readonly maxGuessesPerNumber: number;

  /** Valid guess/answer range [min, max] inclusive. */
  readonly guessMin: number;
  readonly guessMax: number;

  /**
   * House fee in basis points. Default: 1000 = 10%.
   * 90% of each pair's pot is distributed to winners; the fee share
   * accumulates in `houseFeeAccumulated` for owner claim.
   */
  readonly protocolFeeBps: number;

  /** God Mode reveal policy (off-chain UX, not enforced on-chain). */
  readonly godMode: GodModeMode;

  /** Entry window duration in seconds (off-chain, enforced by owner). */
  readonly entryWindowSeconds: number;
}

/** God Mode reveal mode. */
export enum GodModeMode {
  Disabled = 'disabled',
  OptIn = 'opt-in',
  FullReveal = 'full-reveal',
  Delayed = 'delayed',
}

// ============================================================================
// Entries
// ============================================================================

export interface PlayerEntry {
  readonly playerPk: string;
  /** On-chain assigned pool (hidden from the player via UI obfuscation). */
  readonly poolId: PoolId;
  /** Hiding commitment of (answer, salt). */
  readonly answerCommitment: string;
  /** Public guess value. */
  readonly guess: number;
  readonly committedAt: number;
}

/**
 * Private player state — never sent to the chain.
 * Stored locally (wallet/localStorage) keyed by round ID.
 */
export interface PlayerPrivateState {
  /** The player's answer — the number OTHERS try to guess. */
  readonly myAnswer: number;
  /** 32-byte salt mixed into the commitment. REQUIRED for God Mode reveal. */
  readonly answerSalt: Uint8Array;
  /** The player's guess of their opponent's answer. */
  readonly myGuess: number;
  /** Round ID this state belongs to. */
  readonly roundId: number;
}

// ============================================================================
// Matching & Settlement
// ============================================================================

export interface MatchPair {
  readonly playerAPk: string;
  readonly playerBPk: string;
  /** The pool this pair belongs to (same for both players). */
  readonly poolId: PoolId;
}

export enum MatchOutcome {
  AWins = 'a-wins',
  BWins = 'b-wins',
  Split = 'split',
  Draw = 'draw',
}

export interface MatchResult {
  readonly pair: MatchPair;
  readonly outcome: MatchOutcome;
  readonly payoutA: bigint;
  readonly payoutB: bigint;
  /** House fee from this pair (contributes to houseFeeAccumulated on-chain). */
  readonly houseFee: bigint;
  readonly aGuessedB: boolean;
  readonly bGuessedA: boolean;
}

export interface UnpairedPlayer {
  readonly playerPk: string;
  readonly poolId: PoolId;
  readonly refund: bigint;
}

// ============================================================================
// Round Snapshot / Summary
// ============================================================================

export interface RoundSnapshot {
  readonly roundId: number;
  readonly phase: RoundPhase;
  readonly playerCount: number;
  readonly config: RoundConfig;
  readonly entries: readonly PlayerEntry[];
  /** Per-pool state. */
  readonly pools: readonly PoolState[];
  /** Convenience: how many pools are currently ready. */
  readonly poolsReadyCount: number;
  readonly houseFeeAccumulated: bigint;
  readonly lockedAt?: number;
  readonly settledAt?: number;
}

export interface RoundSummary extends RoundSnapshot {
  readonly matches: readonly MatchResult[];
  readonly unpaired: readonly UnpairedPlayer[];
  readonly totalStake: bigint;
  readonly totalPayout: bigint;
  readonly godMode?: GodModeData;
}

export interface GodModeData {
  readonly reveals: readonly PlayerReveal[];
}

export interface PlayerReveal {
  readonly playerPk: string;
  readonly poolId: PoolId;
  readonly answer: number;
  readonly verified: boolean;
}

// ============================================================================
// UI Display Helpers
// ============================================================================

/** Per-pool per-number capacity for UI rendering. */
export interface GuessBucketCapacity {
  readonly poolId: PoolId;
  readonly guessValue: number;
  readonly currentCount: number;
  readonly maxCount: number;
  readonly available: number;
  readonly isFull: boolean;
}

/** Aggregated capacity across ALL pools for a given guess value. */
export interface AggregatedGuessCapacity {
  readonly guessValue: number;
  /** Sum across pools; useful for "is this number available anywhere?" display. */
  readonly totalAvailable: number;
  readonly totalMax: number;
}

// ============================================================================
// Proof Receipt
// ============================================================================

export interface ProofReceipt {
  readonly roundId: number;
  readonly playerPk: string;
  readonly poolId: PoolId;
  readonly outcome:
    | 'won'
    | 'lost'
    | 'split'
    | 'draw'
    | 'refund-aborted'
    | 'refund-unpaired';
  readonly payout: bigint;
  readonly txHash: string;
  readonly timestamp: number;
}

// ============================================================================
// Runtime Config
// ============================================================================

export type NetworkId = 'undeployed' | 'devnet' | 'testnet' | 'mainnet';

export interface RuntimeConfig {
  readonly networkId: NetworkId;
  readonly proofServerUrl: string;
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly nodeUrl: string;
  readonly contractAddress: string | null;
  readonly faucetUrl?: string;
}
