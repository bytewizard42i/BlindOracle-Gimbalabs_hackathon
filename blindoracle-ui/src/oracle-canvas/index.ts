/**
 * Oracle Canvas — public API barrel.
 *
 * Import from `./oracle-canvas` in the UI layer. Do not import deeper
 * (keeps internals free to refactor).
 */

export { OracleCanvas, type OracleCanvasProps } from './OracleCanvas';
export type { OracleMood, Wasm3dOracle, Wasm3dOracleFactory } from './types';
export { resolveWasm3dOracle } from './wasm3d-loader';
