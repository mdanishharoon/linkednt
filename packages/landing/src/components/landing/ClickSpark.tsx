"use client";

// ClickSpark.tsx — spark burst on click, adapted from ReactBits' Click Spark
// (reactbits.dev/animations/click-spark), dependency-free. Renders a canvas
// over its positioned parent (with bleed so edge sparks aren't clipped);
// call burst(event) from the triggering button's onClick.
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

const BLEED = 32;

export type SparkHandle = {
  burst: (e: { clientX: number; clientY: number; currentTarget: Element }) => void;
};

type Spark = { x: number; y: number; angle: number; start: number };

export function ClickSpark({
  ref,
  color = "#0a66c2",
  count = 9,
  radius = 22,
  size = 8,
  duration = 450,
}: {
  ref: Ref<SparkHandle>;
  color?: string;
  count?: number;
  radius?: number;
  size?: number;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useImperativeHandle(ref, () => ({
    burst(e) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // keyboard "clicks" have no coordinates — burst from the button center
      const btn = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX || btn.left + btn.width / 2) - rect.left;
      const y = (e.clientY || btn.top + btn.height / 2) - rect.top;
      const now = performance.now();
      for (let i = 0; i < count; i++) {
        sparks.current.push({
          x,
          y,
          angle: (2 * Math.PI * i) / count,
          start: now,
        });
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      cancelAnimationFrame(raf.current);
      const draw = (t: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        sparks.current = sparks.current.filter((s) => {
          const p = (t - s.start) / duration;
          if (p >= 1) return false;
          const eased = p * (2 - p);
          const d = eased * radius;
          const len = size * (1 - eased);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(s.x + d * Math.cos(s.angle), s.y + d * Math.sin(s.angle));
          ctx.lineTo(
            s.x + (d + len) * Math.cos(s.angle),
            s.y + (d + len) * Math.sin(s.angle),
          );
          ctx.stroke();
          return true;
        });
        if (sparks.current.length) raf.current = requestAnimationFrame(draw);
      };
      raf.current = requestAnimationFrame(draw);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: -BLEED,
        width: `calc(100% + ${BLEED * 2}px)`,
        height: `calc(100% + ${BLEED * 2}px)`,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}
