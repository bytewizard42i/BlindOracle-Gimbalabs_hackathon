import { useEffect, useRef, useState } from 'react';
import type { OracleMood, Wasm3dOracle } from './types';
import { resolveWasm3dOracle } from './wasm3d-loader';

/**
 * Whether the current browser supports the HTML-in-Canvas "layoutsubtree"
 * API. If so, we render child elements inside the canvas with full DOM
 * semantics (interactivity, accessibility, screen readers) while the WASM
 * 3D renderer can sample them as textures. If not, we render the form
 * absolutely-positioned over the canvas — identical UX minus the
 * 3D-material-mapped aesthetic.
 *
 * Feature-detection reference:
 *   https://wicg.github.io/html-in-canvas/
 *
 * Enable in Chrome Canary 148+ via: chrome://flags/#canvas-draw-element
 */
function supportsHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas');
  // `drawElementImage` is the 2D-context entry point; its presence is a
  // reliable proxy for the broader feature flipping on. We feature-check
  // via a getContext call to avoid false positives on stale builds.
  const ctx = c.getContext('2d') as (CanvasRenderingContext2D & {
    drawElementImage?: unknown;
  }) | null;
  return typeof ctx?.drawElementImage === 'function';
}

export interface OracleCanvasProps {
  /** Current oracle mood — typically derived from RoundPhase. */
  readonly mood: OracleMood;
  /**
   * Child content rendered *inside* the oracle. When HTML-in-Canvas is
   * supported, these DOM nodes live under the `<canvas layoutsubtree>`
   * and their rasterization is made available to the WASM renderer as a
   * texture. When unsupported, they overlay the canvas instead.
   */
  readonly children?: React.ReactNode;
  /** Canvas width in CSS pixels (default: responsive via parent). */
  readonly width?: number;
  /** Canvas height in CSS pixels (default: responsive via parent). */
  readonly height?: number;
}

/**
 * OracleCanvas — the 3D focal element of BlindOracle.
 *
 * Renders a WASM-driven 3D oracle (or fallback 2D orb) with optional
 * HTML-in-Canvas children for accessible inline form inputs.
 */
export function OracleCanvas({
  mood,
  children,
  width = 640,
  height = 640,
}: OracleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const oracleRef = useRef<Wasm3dOracle | null>(null);
  const [hicSupported] = useState<boolean>(() => supportsHtmlInCanvas());

  // Mount: initialize the renderer and start the rAF loop.
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    (async () => {
      if (!canvasRef.current) return;

      // Account for devicePixelRatio so the orb stays crisp.
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      const factory = await resolveWasm3dOracle();
      if (cancelled) return;

      const oracle = await factory();
      if (cancelled) {
        oracle.dispose();
        return;
      }

      await oracle.init(canvasRef.current);
      if (formRef.current && oracle.setEntryFormElement) {
        oracle.setEntryFormElement(formRef.current);
      }
      oracleRef.current = oracle;

      const loop = (t: number) => {
        if (cancelled || !oracleRef.current) return;
        oracleRef.current.render(t);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[OracleCanvas] init failed', err);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      oracleRef.current?.dispose();
      oracleRef.current = null;
    };
  }, [width, height]);

  // Mood changes propagate to the renderer.
  useEffect(() => {
    oracleRef.current?.setMood(mood);
  }, [mood]);

  // When HIC is supported, children go *inside* the canvas via
  // the experimental `layoutsubtree` attribute. React doesn't type it yet,
  // so we spread it via an untyped props object.
  // Ref: https://github.com/WICG/html-in-canvas
  const canvasProps: Record<string, unknown> = {
    ref: canvasRef,
    style: { display: 'block', maxWidth: '100%' },
  };
  if (hicSupported) {
    canvasProps.layoutsubtree = '';
  }

  return (
    <div style={{ position: 'relative', width, height, margin: '0 auto' }}>
      <canvas {...canvasProps}>
        {hicSupported ? (
          <div ref={formRef} style={entryFormInsideCanvasStyle}>
            {children}
          </div>
        ) : null}
      </canvas>

      {!hicSupported ? (
        <div ref={formRef} style={entryFormOverlayStyle}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

// Styles -----------------------------------------------------------------------

const entryFormInsideCanvasStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // No visual background — the WASM renderer is painting the surface beneath.
};

const entryFormOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
};
