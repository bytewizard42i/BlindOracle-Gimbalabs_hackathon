/**
 * Oracle Canvas — shared types
 *
 * The Oracle Canvas is the 3D-rendered focal element of the BlindOracle UI.
 * It sits behind the player entry form and responds to the current round
 * phase with visual moods.
 */

/**
 * Visual moods the oracle cycles through during a round.
 * Maps roughly to RoundPhase but adds two cinematic states:
 *   - "dormant"  : pre-round, slow idle breathing
 *   - "awakening": player is mid-commit (focus in input fields)
 *   - "judging"  : match/settle is running
 *   - "revealing": God Window is active
 */
export type OracleMood = 'dormant' | 'awakening' | 'judging' | 'revealing';

/**
 * Minimal interface any WASM 3D renderer must implement to plug into
 * the BlindOracle oracle canvas.
 *
 * Sebastien Guillemot's experimental WASM 3D artifact is expected to be
 * wrapped by an adapter that conforms to this interface (see
 * `./wasm3d-loader.ts`).
 */
export interface Wasm3dOracle {
  /**
   * Initialize the renderer against a host canvas. Called once at mount.
   * Implementations typically acquire a WebGL2 or WebGPU context.
   */
  init(canvas: HTMLCanvasElement): Promise<void>;

  /**
   * Set the current visual mood. Smooth transitions are the
   * implementer's responsibility.
   */
  setMood(mood: OracleMood): void;

  /**
   * Pass a reference to a DOM element (typically the entry form) whose
   * rasterization should be applied as a texture on the oracle. Used with
   * HTML-in-Canvas' texElementImage2D (WebGL) or drawElementImage (2D).
   * Implementations may ignore this if they don't map HTML to a surface.
   */
  setEntryFormElement?(element: HTMLElement): void;

  /**
   * Render one frame. Called by the host via requestAnimationFrame.
   * timeMs is a monotonic millisecond timestamp.
   */
  render(timeMs: number): void;

  /**
   * Teardown. Called on unmount.
   */
  dispose(): void;
}

/**
 * Factory function shape for a WASM 3D renderer module.
 * The default export of the loader module must be this type.
 */
export type Wasm3dOracleFactory = () => Promise<Wasm3dOracle>;
