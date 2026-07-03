"use client";

// MorphHeight.tsx — wraps swapped content and eases its height instead of
// letting the container snap when children change (voice switches, the
// slop/translation toggle). Measures via ResizeObserver; the transition
// lives in CSS (.morph-h) so reduced-motion can opt out.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function MorphHeight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number>();

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setH(el.offsetHeight);
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={"morph-h " + className} style={{ height: h }}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
