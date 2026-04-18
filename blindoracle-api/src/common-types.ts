/**
 * BlindOracle — Shared TypeScript Types
 *
 * These types are consumed by blindoracle-contract, blindoracle-ui,
 * and any external integrations. They mirror the on-chain Compact
 * contract's state and circuit signatures.
 */

// ============================================================================
// Round Lifecycle
// ============================================================================

/** Round phase — mirrors the on-chain enum */
export enum RoundPhase {
  Open = 0,
  Locked = 1,
  Settling = 2,
  Settled = 3,
}

/** Configuration for a round */
export interface RoundConfig {
  /** Minimum secret value (inclusive) */
  readonly secretMin: number;
  /** Maximum secret value (inclusive) */
  readonly secretMax: number;
  /** Minimum guess value (inclusive, usually same as secretMin) */
  readonly guessMin: number;
  /** Maximum guess value (inclusive, usually same as secretMax) */
  readonly guessMax: number;
  /** Fixed stake amount per player (in NIGHT base units) */
  readonly stakeAmount: bigint;
  /** Minimum players required to start */
  readonly minPlayers: number;
  /** Maximum players per round */
  readonly maxPlayers: number;
  /** Entry window duration in seconds */
  readonly entryWindowSeconds: number;
  /** Protocol fee in basis points (e.g., 200 = 2%) */
  readonly protocolFeeBps: number;
  /** God Window mode */
  readonly godWindow: GodWindowMode;
}

/** God Window disclosure mode */
export enum GodWindowMode {
  /** No post-settlement reveal */
  Disabled = 'disabled',
  /** Each player can opt in to reveal their own values */
  OptIn = 'opt-in',
  /** All secrets revealed after settlement (set at round creation) */
  FullReveal = 'full-reveal',
  /** Automatic reveal after configurable delay */
  Delayed = 'delayed',
}

// ============================================================================
// Player Commitments
// ============================================================================

/** A player's commitment in a round */
export interface PlayerCommitment {
  /** Player public key identifier (hex-encoded Bytes<32>) */
  readonly playerPk: string;
  /** Hiding commitment to the secret number (hex-encoded Bytes<32>) */
  readonly secretCommitment: string;
  /** Hiding commitment to the guess number (hex-encoded Bytes<32>) */
  readonly guessCommitment: string;
  /** Timestamp when the commitment was submitted (ms since epoch) */
  readonly committedAt: number;
}

/** Raw private values known only to the prover */
export interface PrivateValues {
  readonly secret: number;
  readonly guess: number;
}

// ============================================================================
// Matching
// ============================================================================

/** A pair of players matched for scoring */
export interface MatchPair {
  readonly playerAPk: string;
  readonly playerBPk: string;
}

/** Outcome of a matched pair after scoring */
export enum MatchOutcome {
  /** Player A wins (A guessed B's secret correctly) */
  AWins = 'a-wins',
  /** Player B wins (B guessed A's secret correctly) */
  BWins = 'b-wins',
  /** Both players guessed correctly — split the pot */
  Split = 'split',
  /** Neither player guessed correctly — refund minus fee */
  Draw = 'draw',
}

/** Full result for a match */
export interface MatchResult {
  readonly pair: MatchPair;
  readonly outcome: MatchOutcome;
  readonly payoutA: bigint;
  readonly payoutB: bigint;
  /** Whether player A's guess matched player B's secret */
  readonly aGuessedB: boolean;
  /** Whether player B's guess matched player A's secret */
  readonly bGuessedA: boolean;
}

/** An unpaired player (odd player count) */
export interface UnpairedPlayer {
  readonly playerPk: string;
  /** Stake returned in full (no penalty) */
  readonly refund: bigint;
}

// ============================================================================
// Round Summary
// ============================================================================

/** Full summary of a completed round */
export interface RoundSummary {
  readonly roundId: number;
  readonly phase: RoundPhase;
  readonly config: RoundConfig;
  readonly playerCount: number;
  readonly totalStake: bigint;
  readonly totalPayout: bigint;
  readonly protocolFeeCollected: bigint;
  readonly matches: readonly MatchResult[];
  readonly unpaired: readonly UnpairedPlayer[];
  readonly lockedAt?: number;
  readonly settledAt?: number;
  /** Present only if God Window is enabled and reveals exist */
  readonly godWindow?: GodWindowData;
}

/** Revealed values for the God Window display */
export interface GodWindowData {
  readonly reveals: readonly PlayerReveal[];
}

/** A single player's revealed secret and guess */
export interface PlayerReveal {
  readonly playerPk: string;
  readonly secret: number;
  readonly guess: number;
  readonly verified: boolean;
}

// ============================================================================
// Proof Receipt
// ============================================================================

/** Verifiable proof of a player's round outcome */
export interface ProofReceipt {
  readonly roundId: number;
  readonly playerPk: string;
  readonly outcome: 'won' | 'lost' | 'split' | 'draw' | 'refund';
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
