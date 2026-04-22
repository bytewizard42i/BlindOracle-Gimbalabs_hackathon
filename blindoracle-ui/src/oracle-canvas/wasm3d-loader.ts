import type { Wasm3dOracle, Wasm3dOracleFactory, OracleMood } from './types';

/**
 * WASM 3D loader — pluggable adapter layer.
 *
 * When we locate and integrate Sebastien Guillemot's experimental WASM
 * 3D artifact, this module is where the adapter lives. Until then, the
 * `fallbackOracle` below provides a minimal, dependency-free 2D canvas
 * rendering of a slowly-rotating obsidian orb so development and demos
 * aren't blocked on the 3D artifact being ready.
 *
 * USAGE (from <OracleCanvas />):
 *
 *   const factory = await resolveWasm3dOracle();
 *   const oracle = await factory();
 *   await oracle.init(canvasEl);
 *   // ... rAF loop calls oracle.render(ts) ...
 *   oracle.dispose();
 *
 * WIRING SEBASTIEN'S ARTIFACT:
 *
 *   1. Drop the WASM bundle into `public/wasm/oracle-3d/`.
 *   2. Implement the adapter in `./wasm3d-sebastien-adapter.ts` matching
 *      the Wasm3dOracle interface from `./types`.
 *   3. Flip USE_WASM_ORACLE to true below (or wire it to an env flag).
 */

const USE_WASM_ORACLE = false; // flip to true once Sebastien's artifact is integrated

export async function resolveWasm3dOracle(): Promise<Wasm3dOracleFactory> {
  if (USE_WASM_ORACLE) {
    // Lazy dynamic import so the fallback bundle doesn't carry WASM bytes.
    // Keep the specifier string literal so Vite tree-shakes correctly.
    // NOTE: this adapter module is intentionally not yet created; it will
    // be added alongside the real WASM artifact. The @ts-expect-error below
    // is intentional and should be removed once the adapter file exists.
    // @ts-expect-error - wasm3d-sebastien-adapter module will be added later
    const adapter = await import(/* @vite-ignore */ './wasm3d-sebastien-adapter');
    return adapter.default as Wasm3dOracleFactory;
  }

  return fallbackOracleFactory;
}

// -----------------------------------------------------------------------------
// Fallback oracle — 2D canvas, no WASM. Keeps development unblocked.
// -----------------------------------------------------------------------------

const fallbackOracleFactory: Wasm3dOracleFactory = async () => {
  return new FallbackOracle();
};

class FallbackOracle implements Wasm3dOracle {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private mood: OracleMood = 'dormant';
  private rafId: number | null = null;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('FallbackOracle: 2D canvas context unavailable');
    }
    this.ctx = ctx;
  }

  setMood(mood: OracleMood): void {
    this.mood = mood;
  }

  render(timeMs: number): void {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const t = timeMs / 1000;

    // Clear with near-black.
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, width, height);

    // Orb pulse radius depends on mood.
    const baseRadius = Math.min(width, height) * 0.18;
    const pulse =
      this.mood === 'judging'
        ? Math.sin(t * 3) * 0.12
        : this.mood === 'revealing'
        ? Math.sin(t * 1.5) * 0.2
        : Math.sin(t * 0.6) * 0.04;
    const radius = baseRadius * (1 + pulse);

    // Violet halo.
    const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.5);
    grad.addColorStop(0, 'rgba(157, 78, 221, 0.7)');
    grad.addColorStop(0.4, 'rgba(157, 78, 221, 0.15)');
    grad.addColorStop(1, 'rgba(10, 10, 20, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Core orb.
    const core = this.ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      radius * 0.1,
      cx,
      cy,
      radius
    );
    core.addColorStop(0, '#ffd60a');
    core.addColorStop(0.25, '#9d4edd');
    core.addColorStop(1, '#1a1026');
    this.ctx.fillStyle = core;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Rotating ring for awakening/judging.
    if (this.mood !== 'dormant') {
      this.ctx.strokeStyle = 'rgba(255, 214, 10, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * 1.6, t, t + Math.PI * 1.2);
      this.ctx.stroke();
    }
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.canvas = null;
    this.ctx = null;
  }
}
