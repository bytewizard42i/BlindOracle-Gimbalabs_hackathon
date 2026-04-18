/**
 * BlindOracle — Witness definitions and private state
 *
 * Witnesses provide private inputs to Compact circuits.
 * The prover (player's browser via Lace wallet) executes these locally.
 * Values never leave the prover — only ZK proofs of correct execution go on-chain.
 */

export interface BlindOraclePrivateState {
  /** Player's local signing key (Bytes<32>) */
  readonly secretKey: Uint8Array;
  /** The secret number chosen for this round */
  readonly secretNumber: number;
  /** The guess for this round */
  readonly guessNumber: number;
}

export interface BlindOracleWitnessContext {
  readonly privateState: BlindOraclePrivateState;
}

/**
 * Witness implementations — these will be wired to the Compact runtime
 * via @midnight-ntwrk/compact-runtime's WitnessProvider interface.
 *
 * After compact compilation generates the contract's expected witness
 * type signatures, these implementations will be typed against them.
 */
export const witnesses = {
  local_secret_key: ({ privateState }: BlindOracleWitnessContext): Uint8Array => {
    return privateState.secretKey;
  },

  get_secret_number: ({ privateState }: BlindOracleWitnessContext): bigint => {
    return BigInt(privateState.secretNumber);
  },

  get_guess_number: ({ privateState }: BlindOracleWitnessContext): bigint => {
    return BigInt(privateState.guessNumber);
  },

  get_round_entropy: (_ctx: BlindOracleWitnessContext): Uint8Array => {
    // In production, derive entropy from a verifiable source.
    // For MVP, the round manager provides entropy off-chain.
    const entropy = new Uint8Array(32);
    globalThis.crypto.getRandomValues(entropy);
    return entropy;
  },
};
