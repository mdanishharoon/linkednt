"use client";

// honesty.tsx — global "Honesty mode" state shared across the page.
import { createContext, useContext, useState, type ReactNode } from "react";

type HonestyValue = {
  honest: boolean;
  setHonest: (fn: (h: boolean) => boolean) => void;
};

export const HonestyContext = createContext<HonestyValue>({
  honest: false,
  setHonest: () => {},
});

export function HonestyProvider({ children }: { children: ReactNode }) {
  const [honest, setHonest] = useState(false);
  return (
    <HonestyContext.Provider value={{ honest, setHonest }}>
      {children}
    </HonestyContext.Provider>
  );
}

export function HonestySwitch({ label = "Honesty mode" }: { label?: string }) {
  const { honest, setHonest } = useContext(HonestyContext);
  return (
    <button
      className="hswitch"
      onClick={() => setHonest((h) => !h)}
      aria-pressed={honest}
    >
      <span className="lbl">{label}</span>
      <span className={"track" + (honest ? " on" : "")}>
        <span className="knob" />
      </span>
    </button>
  );
}
