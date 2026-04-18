/**
 * BlindOracle — Shared TypeScript Types
 *
 * These types mirror the on-chain Compact contract. Consumed by the UI,
 * future external integrations, and tests.
 *
 * CRITICAL VOCABULARY (do not conflate):
 *
 *   answer  — The number a player LOCKS IN for OTHER players to try to guess.
 *             PRIVATE. Stored only as a hiding commitment on-chain.
 *             NEVER capacity-capped.
 *
 *   guess   — The number a player is BETTING their opponent's answer will be.
 *             PUBLIC at commit time. Stored directly on-chain.
 *             CAPACITY-CAPPED (maxGuessesPerNumber players per value).
 */

// ============================================================================
// Round Lifecycle
// ============================================================================

/** Round phase — must match the on-chain enum values (0-5). */
export enum RoundPhase {
  /** Round created, entries accepted but player count below minimum. */
  Forming = 0,
  /** Minimum players reached; entry window counting down. */
  Open = 1,
  /** No more entries; matching in progress. */
  Locked = 2,
  /** Match results being submitted one pair at a time. */
  Settling = 3,
  /** All payouts assigned; round complete. */
  Settled = 4,
  /** Entry window expired below minimum; refunds claimable. */
  Aborted = 5,
}

/** Terminal states (round cannot progress further without new_round). */
export const TERMINAL_PHASES: readonly RoundPhase[] = [
  RoundPhase.Settled,
  RoundPhase.Aborted,
];

/** Phases during which new entries are accepted. */
export const ENTRY_PHASES: readonly RoundPhase[] = [
  RoundPhase.Forming,
  RoundPhase.Open,
];

// ============================================================================
// Round Configuration
// ============================================================================

/** Configuration set at contract deployment (mirrors the sealed ledger fields). */
export interface RoundConfig {
  /** Owner's public key (hex-encoded Bytes<32>). */
  readonly owner: string;

  /** Fixed stake amount per player (NIGHT base units). */
  readonly stakeAmount: bigint;

  /** Minimum players needed for round to progress from Forming to Open. */
  readonly minPlayers: number;

  /** Hard ceiling on players per round. */
  readonly maxPlayers: number;

  /**
   * Anti-crowd cap: no single guess value may be chosen by more than this
   * many players. Example: range 1-10 with cap 3 allows max 30 players total.
   */
  readonly maxGuessesPerNumber: number;

  /** Valid answer/guess range [min, max] inclusive. */
  readonly guessMin: number;
  readonly guessMax: number;

  /** Protocol fee in basis points (200 = 2%). */
  readonly protocolFeeBps: number;

  /** God Window reveal mode (off-chain UX policy, not enforced on-chain). */
  readonly godWindow: GodWindowMode;

  /** Entry window duration in seconds (off-chain, enforced by owner). */
  readonly entryWindowSeconds: number;
}

/** God Window disclosure mode. */
export enum GodWindowMode {
  /** No post-settlement reveal offered. */
  Disabled = 'disabled',
  /** Each player chooses whether to reveal their own answer. */
  OptIn = 'opt-in',
  /** All answers revealed after settlement (configured at round creation). */
  FullReveal = 'full-reveal',
  /** Automatic reveal after configurable delay. */
  Delayed = 'delayed',
}

// ============================================================================
// Player Entries
// ============================================================================

/** A player's full on-chain entry (public data). */
export interface PlayerEntry {
  /** Player public key (hex-encoded Bytes<32>). */
  readonly playerPk: string;

  /** Hiding commitment of (answer, salt) — answer stays hidden. */
  readonly answerCommitment: string;

  /** The player's PUBLIC guess of their opponent's answer. */
  readonly guess: number;

  /** Local timestamp of submission (off-chain, for display). */
  readonly committedAt: number;
}

/**
 * A player's private state — never sent to the chain.
 * Stored locally (wallet/localStorage) keyed by round ID.
 */
export interface PlayerPrivateState {
  /** The player's answer — the number OTHERS try to guess. */
  readonly myAnswer: number;

  /** The salt mixed into the answer commitment. Required for God Window reveal. */
  readonly answerSalt: Uint8Array;

  /** The player's guess — what they think their OPPONENT's answer will be. */
  readonly myGuess: number;

  /** The round ID this private state belongs to. */
  readonly roundId: number;
}

// ============================================================================
// Matching & Settlement
// ============================================================================

/** A pair of players matched for scoring. */
export interface MatchPair {
  readonly playerAPk: string;
  readonly playerBPk: string;
}

/** Outcome of a matched pair after scoring. */
export enum MatchOutcome {
  /** Player A guessed B's answer correctly; B did not guess A's. */
  AWins = 'a-wins',
  /** Player B guessed A's answer correctly; A did not guess B's. */
  BWins = 'b-wins',
  /** Both guessed correctly — pot split. */
  Split = 'split',
  /** Neither guessed correctly — stakes refunded minus fee. */
  Draw = 'draw',
}

/** Full scoring result for a match. */
export interface MatchResult {
  readonly pair: MatchPair;
  readonly outcome: MatchOutcome;
  readonly payoutA: bigint;
  readonly payoutB: bigint;
  /** Did A's guess match B's answer? */
  readonly aGuessedB: boolean;
  /** Did B's guess match A's answer? */
  readonly bGuessedA: boolean;
}

/** An unpaired player (odd player count) — receives full refund. */
export interface UnpairedPlayer {
  readonly playerPk: string;
  readonly refund: bigint;
}

// ============================================================================
// Round Summary
// ============================================================================

/** Snapshot of on-chain round state for UI display. */
export interface RoundSnapshot {
  readonly roundId: number;
  readonly phase: RoundPhase;
  readonly playerCount: number;
  readonly config: RoundConfig;
  /** Public entries (answers hidden, guesses visible). */
  readonly entries: readonly PlayerEntry[];
  /** Live tally of how many players have chosen each guess number. */
  readonly guessBucketCounts: ReadonlyMap<number, number>;
  readonly lockedAt?: number;
  readonly settledAt?: number;
}

/** Final round summary after settlement. */
export interface RoundSummary extends RoundSnapshot {
  readonly matches: readonly MatchResult[];
  readonly unpaired: readonly UnpairedPlayer[];
  readonly totalStake: bigint;
  readonly totalPayout: bigint;
  readonly protocolFeeCollected: bigint;
  readonly godWindow?: GodWindowData;
}

/** Revealed answers for God Window display. */
export interface GodWindowData {
  readonly reveals: readonly PlayerReveal[];
}

/** A single player's revealed answer (post-settlement). */
export interface PlayerReveal {
  readonly playerPk: string;
  readonly answer: number;
  readonly verified: boolean;
}

// ============================================================================
// Guess Capacity Helpers
// ============================================================================

/** Real-time capacity info for the UI to display which numbers are still pickable. */
export interface GuessBucketCapacity {
  readonly guessValue: number;
  readonly currentCount: number;
  readonly maxCount: number;
  readonly available: number;
  readonly isFull: boolean;
}

// ============================================================================
// Proof Receipt
// ============================================================================

/** Verifiable proof of a player's round outcome. */
export interface ProofReceipt {
  readonly roundId: number;
  readonly playerPk: string;
  readonly outcome: 'won' | 'lost' | 'split' | 'draw' | 'refund-aborted' | 'refund-unpaired';
  readonly payout: bigint;
  readonly txHash: string;
  readonly timestamp: number;
}

// ============================================================================
// Network / Runtime Config
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
