/**
 * BlindOracle — Game Logic (v3, pooled)
 *
 * Off-chain scoring, per-pool pairing, commitment construction, bot simulation.
 * Settlement splits 90% to winners / 10% house fee.
 */

import type {
  AggregatedGuessCapacity,
  GuessBucketCapacity,
  MatchPair,
  MatchResult,
  PlayerEntry,
  PoolId,
  RoundConfig,
  UnpairedPlayer,
} from './common-types.js';
import { MatchOutcome } from './common-types.js';

// ============================================================================
// Scoring (90/10 split)
// ============================================================================

/**
 * Score a match within a pool.
 *
 * Fee model: the pot is `2 × stakeAmount`. `protocolFeeBps` of the pot
 * is the house fee (default 1000 bps = 10%); the remainder goes to winners.
 *
 * Returned houseFee is the portion that goes to the owner's
 * `houseFeeAccumulated` via `submit_match_result`.
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
  const houseFee = (pot * BigInt(config.protocolFeeBps)) / 10000n;
  const winnersPool = pot - houseFee;

  let outcome: MatchOutcome;
  let payoutA: bigint;
  let payoutB: bigint;

  if (aGuessedB && bGuessedA) {
    outcome = MatchOutcome.Split;
    payoutA = winnersPool / 2n;
    payoutB = winnersPool / 2n;
  } else if (aGuessedB) {
    outcome = MatchOutcome.AWins;
    payoutA = winnersPool;
    payoutB = 0n;
  } else if (bGuessedA) {
    outcome = MatchOutcome.BWins;
    payoutA = 0n;
    payoutB = winnersPool;
  } else {
    // Neither guessed correctly. Refund stakes minus shared house fee.
    outcome = MatchOutcome.Draw;
    payoutA = config.stakeAmount - houseFee / 2n;
    payoutB = config.stakeAmount - houseFee / 2n;
  }

  return {
    pair,
    outcome,
    payoutA,
    payoutB,
    houseFee,
    aGuessedB,
    bGuessedA,
  };
}

// ============================================================================
// Per-Pool Pairing
// ============================================================================

/**
 * Pair players within each pool independently.
 *
 * Matching only happens between real players who landed in the same pool.
 * Bots (UI fiction) are never involved in actual pairing.
 */
export function computePoolMatchPairs(
  playerPksByPool: ReadonlyMap<PoolId, readonly string[]>,
  entropyHex: string,
  stakeAmount: bigint,
): { pairs: MatchPair[]; unpaired: UnpairedPlayer[] } {
  const pairs: MatchPair[] = [];
  const unpaired: UnpairedPlayer[] = [];

  for (const [poolId, playerPks] of playerPksByPool) {
    if (playerPks.length < 2) {
      for (const pk of playerPks) {
        unpaired.push({ playerPk: pk, poolId, refund: stakeAmount });
      }
      continue;
    }

    // Per-pool deterministic shuffle — include pool ID in the seed so
    // that different pools get independent shuffles even with the same
    // underlying entropy.
    const poolEntropy = entropyHex + poolId.toString(16).padStart(8, '0');
    const shuffled = deterministicShuffle([...playerPks], poolEntropy);

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const a = shuffled[i];
      const b = shuffled[i + 1];
      if (a !== undefined && b !== undefined) {
        pairs.push({ playerAPk: a, playerBPk: b, poolId });
      }
    }

    if (shuffled.length % 2 === 1) {
      const last = shuffled[shuffled.length - 1];
      if (last !== undefined) {
        unpaired.push({ playerPk: last, poolId, refund: stakeAmount });
      }
    }
  }

  return { pairs, unpaired };
}

/** Fisher-Yates seeded shuffle — deterministic given the same entropy. */
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

/** Group entries by pool for pairing. */
export function groupEntriesByPool(
  entries: readonly PlayerEntry[],
): Map<PoolId, string[]> {
  const byPool = new Map<PoolId, string[]>();
  for (const entry of entries) {
    const existing = byPool.get(entry.poolId) ?? [];
    existing.push(entry.playerPk);
    byPool.set(entry.poolId, existing);
  }
  return byPool;
}

// ============================================================================
// Commitment
// ============================================================================

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

export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

// ============================================================================
// Per-Pool Capacity Helpers
// ============================================================================

/**
 * Compute per-pool, per-guess capacity info.
 *
 * Returns a flat array of every (pool, guess) pair so the UI can render
 * an exhaustive capacity grid.
 */
export function computePoolGuessCapacities(
  guessBucketCounts: ReadonlyMap<PoolId, ReadonlyMap<number, number>>,
  config: RoundConfig,
): GuessBucketCapacity[] {
  const capacities: GuessBucketCapacity[] = [];
  for (let poolId = 0; poolId < config.poolCount; poolId++) {
    const poolCounts = guessBucketCounts.get(poolId) ?? new Map();
    for (let value = config.guessMin; value <= config.guessMax; value++) {
      const currentCount = poolCounts.get(value) ?? 0;
      capacities.push({
        poolId,
        guessValue: value,
        currentCount,
        maxCount: config.maxGuessesPerNumber,
        available: Math.max(0, config.maxGuessesPerNumber - currentCount),
        isFull: currentCount >= config.maxGuessesPerNumber,
      });
    }
  }
  return capacities;
}

/**
 * Aggregate capacity across all pools for a given guess value.
 *
 * The UI shows this to the player because they don't know their pool
 * assignment — they need to see "how many slots remain for 7 across
 * everyone's pools" to make an informed choice.
 */
export function computeAggregatedCapacities(
  guessBucketCounts: ReadonlyMap<PoolId, ReadonlyMap<number, number>>,
  config: RoundConfig,
): AggregatedGuessCapacity[] {
  const aggregated: AggregatedGuessCapacity[] = [];
  for (let value = config.guessMin; value <= config.guessMax; value++) {
    let totalAvailable = 0;
    let totalMax = 0;
    for (let poolId = 0; poolId < config.poolCount; poolId++) {
      const poolCounts = guessBucketCounts.get(poolId) ?? new Map();
      const currentCount = poolCounts.get(value) ?? 0;
      totalAvailable += Math.max(0, config.maxGuessesPerNumber - currentCount);
      totalMax += config.maxGuessesPerNumber;
    }
    aggregated.push({
      guessValue: value,
      totalAvailable,
      totalMax,
    });
  }
  return aggregated;
}

export function isPoolFull(
  realPlayerCount: number,
  config: RoundConfig,
): boolean {
  return realPlayerCount >= config.poolMaxRealPlayers;
}

export function isPoolReady(
  realPlayerCount: number,
  config: RoundConfig,
): boolean {
  return realPlayerCount >= config.poolMinRealPlayers;
}

/** Total real player capacity across all pools. */
export function totalRealPlayerCapacity(config: RoundConfig): number {
  return config.poolCount * config.poolMaxRealPlayers;
}

/** Total minimum real players required for the round to start. */
export function totalMinimumRealPlayers(config: RoundConfig): number {
  return config.poolCount * config.poolMinRealPlayers;
}

// ============================================================================
// Validation
// ============================================================================

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

// ============================================================================
// Bot Simulation (UI fiction)
// ============================================================================

/**
 * Generate deterministic pseudo-bot entries for a pool.
 *
 * IMPORTANT: these bots exist ONLY in the UI. The contract never sees them.
 * They are displayed during the Forming phase to make pools feel active.
 *
 * When a real player enters a pool, the UI should "knock out" one bot to
 * maintain consistent visual player counts.
 */
export function simulateBotEntries(
  poolId: PoolId,
  count: number,
  config: RoundConfig,
  seed: number = 0,
): PlayerEntry[] {
  const bots: PlayerEntry[] = [];
  const range = config.guessMax - config.guessMin + 1;

  for (let i = 0; i < count; i++) {
    // Simple LCG seeded by (poolId, index, seed) for reproducibility
    const rng = (poolId * 1000 + i * 7 + seed * 13) % 2147483647;
    const guess = config.guessMin + (rng % range);
    const fakePk = `0xbot_${poolId}_${i.toString(16).padStart(4, '0')}_${'0'.repeat(50)}`.slice(0, 66);
    const fakeCommit = `0x${'b07'.repeat(21)}`.slice(0, 66);

    bots.push({
      playerPk: fakePk,
      poolId,
      answerCommitment: fakeCommit,
      guess,
      committedAt: Date.now() - (count - i) * 1000,
    });
  }

  return bots;
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
