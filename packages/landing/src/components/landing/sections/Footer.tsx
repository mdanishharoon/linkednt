"use client";

// Easter egg: clicking the disclaimer makes it escalate until it becomes
// the very slop the product exists to kill, then it composes itself.
import { useState } from "react";
import { Logo } from "../Logo";

const DISCLAIMERS = [
  "A parody. Not affiliated with LinkedIn. Obviously.",
  "Genuinely not affiliated. Please keep scrolling.",
  "Our legal budget is $0. Be cool.",
  "Humbled to announce this disclaimer has become a journey. Grateful for everyone who clicked. 🙏",
];

// Bottom-right easter egg: escalates on each click, then stops.
const POT = [
  "hi?",
  "there’s no pot of gold down here",
  "now get the fuck out of my sight before i demolish you",
  "I can still see you mini me",
];

const COLS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["How it works", "#how"],
      ["The phrasebook", "#phrasebook"],
      ["Pricing", "/pricing"],
      ["FAQ", "#faq"],
    ],
  ],
  [
    "Honest links",
    [
      ["Privacy", "/privacy"],
      ["Contact", "mailto:hi@linkednt.com"],
    ],
  ],
];

export function Footer() {
  const [d, setD] = useState(0);
  const [pot, setPot] = useState(0);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo size={24} />
            <p
              style={{
                color: "var(--muted)",
                fontSize: 14.5,
                maxWidth: 260,
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              A Chrome extension that translates LinkedIn posts back into
              whatever the person was actually trying to say.
            </p>
          </div>
          {COLS.map(([h, items]) => (
            <div key={h}>
              <h4>{h}</h4>
              <ul>
                {items.map(([label, href]) => (
                  <li key={label}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 linkedn&rsquo;t</span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: 2,
              background: "var(--muted-2)",
            }}
          />
          <span
            className="footer-disclaimer"
            onClick={() => setD((i) => (i + 1) % DISCLAIMERS.length)}
          >
            {DISCLAIMERS[d]}
          </span>
          <span
            className="footer-disclaimer"
            style={{ marginLeft: "auto", fontWeight: 600 }}
            onClick={() => setPot((i) => Math.min(i + 1, POT.length - 1))}
          >
            {POT[pot]}
          </span>
        </div>
      </div>
    </footer>
  );
}
