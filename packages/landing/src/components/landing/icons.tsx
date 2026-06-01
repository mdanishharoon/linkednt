// icons.tsx — tiny inline SVG icon set + small visual primitives.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const Ico = {
  puzzle: (p: IconProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.1 2.1 0 1 1 0 4.2H2V19a2 2 0 0 0 2 2h3.8v-1.5a2.1 2.1 0 1 1 4.2 0V21H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z" />
    </svg>
  ),
  globe: (p: IconProps) => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...p}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
  thumb: (p: IconProps) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      {...p}
    >
      <path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17 21H7" />
    </svg>
  ),
  comment: (p: IconProps) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      {...p}
    >
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L3 21l1.4-5A8 8 0 1 1 21 11.5z" />
    </svg>
  ),
  repost: (p: IconProps) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      {...p}
    >
      <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  down: (p: IconProps) => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  bolt: (p: IconProps) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  eye: (p: IconProps) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      {...p}
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" />
    </svg>
  ),
};

export function Avatar({ variant = "" }: { variant?: string }) {
  return (
    <div className={"avatar " + variant}>
      <svg viewBox="0 0 40 40" fill="#fff">
        <circle cx="20" cy="15" r="7.5" />
        <path d="M5 40c1.5-9 8-13 15-13s13.5 4 15 13z" />
      </svg>
    </div>
  );
}

export function Stars() {
  return (
    <span className="stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7z" />
        </svg>
      ))}
    </span>
  );
}
