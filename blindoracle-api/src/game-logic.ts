/**
 * BlindOracle — Game Logic Helpers
 *
 * Off-chain scoring, fair pairing, commitment construction, and capacity
 * helpers. These mirror the on-chain settlement rules so the UI can show
 * expected outcomes before settlement finalizes.
 */

import type {
  GuessBucketCapacity,
  MatchPair,
  MatchResult,
  RoundConfig,
  UnpairedPlayer,
} from './common-types.js';
import { MatchOutcome } from './common-types.js';

// ============================================================================
// Scoring
// ============================================================================

/**
 * Score a match between two players given their revealed answers and guesses.
 * Used off-chain for UI preview; the on-chain contract performs the
 * authoritative settlement via `submit_match_result`.
 *
 * Remember: the GUESS is public on-chain, so only the ANSWER needs to be
 * revealed (via God Window) or provided by the settlement service to score.
 */
export function scoreMatch(
  pair: MatchPair,
  answerA: number,
  guessA: number,
  answerB: number,
  guessB: number,
  config: RoundConfig,
): MatchResult {
  const aGuessedB = guessA === answerB;
  const bGuessedA = guessB === answerA;

  const pot = config.stakeAmount * 2n;
  const fee = (pot * BigInt(config.protocolFeeBps)) / 10000n;
  const potAfterFee = pot - fee;

  let outcome: MatchOutcome;
  let payoutA: bigint;
  let payoutB: bigint;

  if (aGuessedB && bGuessedA) {
    outcome = MatchOutcome.Split;
    payoutA = potAfterFee / 2n;
    payoutB = potAfterFee / 2n;
  } else if (aGuessedB) {
    outcome = MatchOutcome.AWins;
    payoutA = potAfterFee;
    payoutB = 0n;
  } else if (bGuessedA) {
    outcome = MatchOutcome.BWins;
    payoutA = 0n;
    payoutB = potAfterFee;
  } else {
    outcome = MatchOutcome.Draw;
    payoutA = config.stakeAmount - fee / 2n;
    payoutB = config.stakeAmount - fee / 2n;
  }

  return { pair, outcome, payoutA, payoutB, aGuessedB, bGuessedA };
}

// ============================================================================
// Deterministic Fair Pairing
// ============================================================================

/**
 * Deterministically pair players after the round locks.
 *
 * Entropy is the SHA-256 hash of all (playerPk, answerCommitment, guess)
 * tuples concatenated in canonical order (sorted by playerPk). This means:
 *   - Pairing is reproducible by any verifier
 *   - No single player can predict their opponent before lock
 *   - No single player can manipulate the pairing (all commitments feed entropy)
 *
 * MVP caveat: vulnerable to grinding if an attacker can rapidly re-commit.
 * Production should use Midnight block-hash beacon or a VRF. See
 * docs/WHAT_YOURE_NOT_THINKING_ABOUT.md for the full solution.
 */
export function computeMatchPairs(
  playerPks: readonly string[],
  entropyHex: string,
  stakeAmount: bigint,
): { pairs: MatchPair[]; unpaired: UnpairedPlayer[] } {
  if (playerPks.length < 2) {
    return {
      pairs: [],
      unpaired: playerPks.map((pk) => ({ playerPk: pk, refund: stakeAmount })),
    };
  }

  const shuffled = deterministicShuffle([...playerPks], entropyHex);

  const pairs: MatchPair[] = [];
  const unpaired: UnpairedPlayer[] = [];

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    if (a !== undefined && b !== undefined) {
      pairs.push({ playerAPk: a, playerBPk: b });
    }
  }

  if (shuffled.length % 2 === 1) {
    const last = shuffled[shuffled.length - 1];
    if (last !== undefined) {
      unpaired.push({ playerPk: last, refund: stakeAmount });
    }
  }

  return { pairs, unpaired };
}

/** Deterministic Fisher-Yates shuffle seeded by entropy. */
function deterministicShuffle<T>(arr: T[], entropyHex: string): T[] {
  const bytes = hexToBytes(entropyHex);
  const result = [...arr];
  let byteIdx = 0;

  for (let i = result.length - 1; i > 0; i--) {
    const b0 = bytes[byteIdx % bytes.length] ?? 0;
    const b1 = bytes[(byteIdx + 1) % bytes.length] ?? 0;
    byteIdx += 2;

    const rand = (b0 << 8) | b1;
    const j = rand % (i + 1);

    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }

  return result;
}

// ============================================================================
// Commitment Construction
// ============================================================================

/**
 * Build an answer commitment: persistentHash of [answer_bytes, salt].
 * Mirrors the on-chain verification in `reveal_for_god_window`.
 *
 * In production, use the @midnight-ntwrk/compact-runtime persistentHash
 * implementation. This TypeScript helper is for UX preview only.
 */
export function buildAnswerCommitmentPreview(
  answer: number,
  salt: Uint8Array,
): { answerBytes: Uint8Array; saltBytes: Uint8Array; concatenated: Uint8Array } {
  if (salt.length !== 32) {
    throw new Error(`Salt must be exactly 32 bytes, got ${salt.length}`);
  }
  const answerBytes = numberToBytes32(answer);
  const concatenated = new Uint8Array(64);
  concatenated.set(answerBytes, 0);
  concatenated.set(salt, 32);
  return { answerBytes, saltBytes: salt, concatenated };
}

/** Generate a cryptographically random 32-byte salt. */
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

// ============================================================================
// Guess Capacity Helpers
// ============================================================================

/**
 * Compute real-time capacity info for every valid guess value in the range.
 * UI uses this to show "X slots remaining" per number, and disable full ones.
 */
export function computeGuessCapacities(
  guessBucketCounts: ReadonlyMap<number, number>,
  config: RoundConfig,
): GuessBucketCapacity[] {
  const capacities: GuessBucketCapacity[] = [];
  for (let value = config.guessMin; value <= config.guessMax; value++) {
    const currentCount = guessBucketCounts.get(value) ?? 0;
    capacities.push({
      guessValue: value,
      currentCount,
      maxCount: config.maxGuessesPerNumber,
      available: Math.max(0, config.maxGuessesPerNumber - currentCount),
      isFull: currentCount >= config.maxGuessesPerNumber,
    });
  }
  return capacities;
}

/** Has the round reached its absolute maximum capacity? */
export function isRoundFull(playerCount: number, config: RoundConfig): boolean {
  return playerCount >= config.maxPlayers;
}

/** Are all guess numbers full (no possible entries left)? */
export function areAllGuessBucketsFull(
  guessBucketCounts: ReadonlyMap<number, number>,
  config: RoundConfig,
): boolean {
  for (let value = config.guessMin; value <= config.guessMax; value++) {
    const count = guessBucketCounts.get(value) ?? 0;
    if (count < config.maxGuessesPerNumber) return false;
  }
  return true;
}

// ============================================================================
// Phase Transition Helpers
// ============================================================================

/** Can the round accept more entries? */
export function canAcceptEntries(
  phase: number,
  playerCount: number,
  config: RoundConfig,
): boolean {
  const inEntryPhase = phase === 0 || phase === 1;
  return inEntryPhase && !isRoundFull(playerCount, config);
}

/** Has the round met its minimum for formal start? */
export function hasMinimumPlayers(
  playerCount: number,
  config: RoundConfig,
): boolean {
  return playerCount >= config.minPlayers;
}

// ============================================================================
// Validation
// ============================================================================

/** Validate that a value is within [min, max] and an integer. */
export function validateValue(
  value: number,
  config: RoundConfig,
  kind: 'answer' | 'guess',
): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${kind} must be an integer, got ${value}`);
  }
  if (value < config.guessMin || value > config.guessMax) {
    throw new Error(
      `${kind} must be in [${config.guessMin}, ${config.guessMax}], got ${value}`,
    );
  }
}

/**
 * Validate that this specific guess value can still be selected given
 * current bucket state. Throws if the bucket is full.
 */
export function validateGuessCapacity(
  guess: number,
  guessBucketCounts: ReadonlyMap<number, number>,
  config: RoundConfig,
): void {
  const current = guessBucketCounts.get(guess) ?? 0;
  if (current >= config.maxGuessesPerNumber) {
    throw new Error(
      `Guess ${guess} is full (${current}/${config.maxGuessesPerNumber}). Pick a different number.`,
    );
  }
}

// ============================================================================
// Byte helpers
// ============================================================================

export function numberToBytes32(value: number): Uint8Array {
  const bytes = new Uint8Array(32);
  let n = BigInt(value);
  for (let i = 31; i >= 0 && n > 0n; i--) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return (
    '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  );
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
