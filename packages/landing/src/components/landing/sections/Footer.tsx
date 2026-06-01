import { Logo } from "../Logo";

const COLS: [string, string[]][] = [
  ["Product", ["How it works", "Examples", "The phrasebook", "Changelog"]],
  ["Company", ["About", "Manifesto", "Careers (real ones)", "Press"]],
  [
    "Honest links",
    ["“Resources”", "“Synergies”", "“Thought leadership”", "Contact"],
  ],
];

export function Footer() {
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
              The browser extension that translates LinkedIn into the language
              humans actually speak.
            </p>
          </div>
          {COLS.map(([h, items]) => (
            <div key={h}>
              <h4>{h}</h4>
              <ul>
                {items.map((it) => (
                  <li key={it}>
                    <a href="#">{it}</a>
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
          <span>A parody. Not affiliated with LinkedIn. Obviously.</span>
          <span style={{ marginLeft: "auto" }}>
            <a href="#" style={{ fontWeight: 600 }}>
              Privacy
            </a>{" "}
            &nbsp;·&nbsp;{" "}
            <a href="#" style={{ fontWeight: 600 }}>
              Terms-ish
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
