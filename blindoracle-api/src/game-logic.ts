/**
 * BlindOracle — Game Logic Helpers
 *
 * Off-chain logic for scoring matches, calculating payouts,
 * and performing deterministic fair pairing. These helpers
 * mirror the on-chain contract's settlement rules so the UI
 * can display expected outcomes before settlement confirms.
 */

import type {
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
 * Score a match between two players given their revealed secrets and guesses.
 * Used off-chain for display; the on-chain contract performs the authoritative
 * settlement via the `submit_match_result` circuit.
 */
export function scoreMatch(
  pair: MatchPair,
  secretA: number,
  guessA: number,
  secretB: number,
  guessB: number,
  config: RoundConfig,
): MatchResult {
  const aGuessedB = guessA === secretB;
  const bGuessedA = guessB === secretA;

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
    // Neither guessed correctly — refund stakes minus fee
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
 * The entropy source is the SHA-256 hash of all commitment hashes concatenated.
 * This means:
 *   - The pairing is reproducible by any verifier with the same commitments
 *   - No player can predict their opponent before commitments lock
 *   - No single player can manipulate the pairing
 *
 * @param playerPks  Array of player public keys (hex strings)
 * @param entropyHex Hex-encoded entropy derived from all commitment hashes
 * @returns Array of pairs and any unpaired player
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

  // Deterministic shuffle using entropy-derived ordering
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

/**
 * Deterministic Fisher-Yates shuffle seeded by entropy.
 * Given the same input and entropy, produces the same output every time.
 */
function deterministicShuffle<T>(arr: T[], entropyHex: string): T[] {
  const bytes = hexToBytes(entropyHex);
  const result = [...arr];
  let byteIdx = 0;

  for (let i = result.length - 1; i > 0; i--) {
    // Consume 2 bytes from entropy, rolling over if we run out
    const b0 = bytes[byteIdx % bytes.length] ?? 0;
    const b1 = bytes[(byteIdx + 1) % bytes.length] ?? 0;
    byteIdx += 2;

    const rand = (b0 << 8) | b1;
    const j = rand % (i + 1);

    // Swap
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }

  return result;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ============================================================================
// Commitment Helpers
// ============================================================================

/**
 * Validates that a secret or guess is within the configured range.
 */
export function validateValue(value: number, config: RoundConfig, kind: 'secret' | 'guess'): void {
  const min = kind === 'secret' ? config.secretMin : config.guessMin;
  const max = kind === 'secret' ? config.secretMax : config.guessMax;

  if (!Number.isInteger(value)) {
    throw new Error(`${kind} must be an integer, got ${value}`);
  }
  if (value < min || value > max) {
    throw new Error(`${kind} must be in [${min}, ${max}], got ${value}`);
  }
}

/**
 * Convert a number to a 32-byte big-endian buffer for commitment hashing.
 * Mirrors the on-chain `(value as Field) as Bytes<32>` conversion.
 */
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
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
