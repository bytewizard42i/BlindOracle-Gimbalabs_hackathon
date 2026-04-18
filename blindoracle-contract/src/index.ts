/**
 * BlindOracle Contract — TypeScript entry point
 *
 * After running `yarn compact`, the Compact compiler generates managed
 * bindings in src/managed/. Those bindings provide:
 *   - Contract deployment helpers
 *   - Circuit call wrappers
 *   - Ledger state types
 *   - Witness type definitions
 *
 * This file re-exports the witness helpers and will re-export managed
 * bindings once they are generated.
 */

export { witnesses, type BlindOraclePrivateState, type BlindOracleWitnessContext } from './witnesses.js';

// After compact compilation, uncomment:
// export * from './managed/blind-oracle/contract/index.cjs';
