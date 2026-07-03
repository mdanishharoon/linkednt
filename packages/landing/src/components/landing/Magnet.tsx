"use client";

// Magnet.tsx — magnetic hover pull, adapted from ReactBits' Magnet
// (reactbits.dev/animations/magnet), dependency-free. The child drifts a few
// pixels toward a nearby cursor and springs back when it leaves. Mouse-only;
// touch and reduced-motion users opt out.
import { useEffect, useRef, type ReactNode } from "react";

export function Magnet({
  children,
  padding = 56,
  strength = 8,
}: {
  children: ReactNode;
  padding?: number;
  strength?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)")
        .matches
    )
      return;
    let active = false;

    const onMove = (e: MouseEvent) => {
      const w = wrap.current;
      const el = inner.current;
      if (!w || !el) return;
      const r = w.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const near =
        Math.abs(e.clientX - cx) < r.width / 2 + padding &&
        Math.abs(e.clientY - cy) < r.height / 2 + padding;
      if (near) {
        active = true;
        el.style.transition = "transform 0.2s ease-out";
        el.style.transform = `translate3d(${(e.clientX - cx) / strength}px, ${(e.clientY - cy) / strength}px, 0)`;
      } else if (active) {
        active = false;
        el.style.transition = "transform 0.45s cubic-bezier(0.3, 1.4, 0.4, 1)";
        el.style.transform = "translate3d(0, 0, 0)";
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [padding, strength]);

  return (
    <div ref={wrap} style={{ display: "inline-block" }}>
      <div
        ref={inner}
        style={{ display: "inline-block", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
