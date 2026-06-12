"use client";

// Marquee.tsx — the buzzword band. Easter egg: click a buzzword and it
// confesses what it means for a moment, then composes itself.
import { useEffect, useRef, useState } from "react";
import { BUZZ } from "@/lib/content";

const TRUTH: Record<string, string> = {
  synergy: "both teams get worse",
  "thought leader": "unemployed, loudly",
  humbled: "bragging",
  "circle back": "never",
  "low-hanging fruit": "work we’ve ignored for years",
  "move the needle": "do anything at all",
  blessed: "born rich",
  rockstar: "underpaid",
  disrupt: "make it worse, faster",
  ninja: "also underpaid",
  "growth mindset": "exploitable",
  grateful: "contractually grateful",
  hustle: "no health insurance",
  "north star": "whatever the CEO said last",
  "deep dive": "skimmed it twice",
  "boil the ocean": "do my job",
  learnings: "mistakes",
  "thrilled to announce": "announcing under duress",
};

function Word({ word }: { word: string }) {
  const [honest, setHonest] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={"word" + (honest ? " truth" : "")}
      onClick={() => {
        setHonest(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setHonest(false), 2400);
      }}
    >
      {honest ? (TRUTH[word] ?? word) : word}
    </button>
  );
}

export function Marquee() {
  const row = [...BUZZ, ...BUZZ];
  return (
    <div className="marqueeband marquee-row">
      <div className="marquee">
        {row.map((w, i) => (
          <span className="mq-item" key={i}>
            <Word word={w} />
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
