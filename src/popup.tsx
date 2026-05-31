import { useEffect, useRef, useState } from "react";

import { getSettings, setSettings } from "~lib/storage";
import { DEFAULT_GROQ_MODEL, type Mode } from "~lib/types";

import "./popup.css";

const LOG = "[linkednt:popup]";

interface ModeOption {
  value: Mode;
  index: string;
  label: string;
  blurb: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "strip",
    index: "01",
    label: "Strip",
    blurb: "Bare facts in one sentence. No hype, no emojis, no hashtags.",
  },
  {
    value: "summarise",
    index: "02",
    label: "Dry Translator",
    blurb: "Plain English, with none of the inspirational packaging.",
  },
  {
    value: "roast",
    index: "03",
    label: "Internal Monologue",
    blurb: "What the post sounds like with the performance removed.",
  },
];

function Popup() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("strip");
  const [savedKey, setSavedKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [model, setModel] = useState(DEFAULT_GROQ_MODEL);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [flashText, setFlashText] = useState("");
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    void getSettings().then((s) => {
      console.info(`${LOG} loaded`, {
        enabled: s.enabled,
        mode: s.mode,
        model: s.model,
        hasApiKey: !!s.apiKey,
      });
      setEnabled(s.enabled);
      setMode(s.mode);
      setSavedKey(s.apiKey);
      setModel(s.model);
    });
  }, []);

  function flash(message: string) {
    setFlashText(message);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashText(""), 1400);
  }

  async function saveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      flash("Missing");
      return;
    }
    await setSettings({ apiKey: trimmed });
    setSavedKey(trimmed);
    setKeyInput("");
    flash("Saved");
    console.info(`${LOG} api key saved`, {
      length: trimmed.length,
      prefix: trimmed.slice(0, 4),
    });
  }

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    await setSettings({ enabled: next });
    flash(next ? "On" : "Off");
    console.info(`${LOG} enabled changed`, { enabled: next });
  }

  async function pickMode(next: Mode) {
    setMode(next);
    await setSettings({ mode: next });
    flash("Saved");
    console.info(`${LOG} mode changed`, { mode: next });
  }

  async function changeModel(next: string) {
    const trimmed = next.trim() || DEFAULT_GROQ_MODEL;
    setModel(trimmed);
    await setSettings({ model: trimmed });
    flash("Saved");
    console.info(`${LOG} model changed`, { model: trimmed });
  }

  async function resetModel() {
    setModel(DEFAULT_GROQ_MODEL);
    await setSettings({ model: DEFAULT_GROQ_MODEL });
    flash("Reset");
    console.info(`${LOG} model reset`, { model: DEFAULT_GROQ_MODEL });
  }

  const summary = savedKey
    ? `${savedKey.slice(0, 8)}...${savedKey.slice(-4)}`
    : "No key on file";

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="title">
        <div className="mark" aria-hidden="true">
          <span>lo</span>
        </div>
        <div className="hero-copy">
          <h1 id="title">linkednt</h1>
          <p className="tagline">Unslop your LinkedIn feed.</p>
        </div>
      </section>

      <div className="signal-row" aria-label="Extension details">
        <span>Local key</span>
        <span>Groq</span>
        <span>LinkedIn only</span>
      </div>

      <section className="panel compact-panel" aria-labelledby="status-title">
        <div className="toggle-row">
          <div>
            <h2 id="status-title">Run on LinkedIn</h2>
            <p className="summary">
              Turn this off if LinkedIn starts acting weird.
            </p>
          </div>
          <label className="switch">
            <input
              id="enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => void toggleEnabled(e.target.checked)}
            />
            <span aria-hidden="true"></span>
          </label>
        </div>
      </section>

      <section className="panel key-panel" aria-labelledby="key-title">
        <div className="section-head">
          <div>
            <h2 id="key-title">Groq key</h2>
            <p className="summary">{summary}</p>
          </div>
          <span className="save-state" aria-live="polite">
            {flashText}
          </span>
        </div>

        <label className="field">
          <span>API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="gsk_..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveKey();
            }}
          />
        </label>

        <button
          className="primary-button"
          type="button"
          onClick={() => void saveKey()}
        >
          <span className="button-icon" aria-hidden="true">
            +
          </span>
          Save key
        </button>
      </section>

      <section className="panel" aria-labelledby="mode-title">
        <div className="section-head tight">
          <div>
            <h2 id="mode-title">Translation voice</h2>
            <p className="summary">Choose how blunt you want it.</p>
          </div>
        </div>

        <div
          className="mode-grid"
          role="radiogroup"
          aria-label="Translation mode"
        >
          {MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="mode-card">
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => void pickMode(opt.value)}
              />
              <span className="mode-index" aria-hidden="true">
                {opt.index}
              </span>
              <span className="mode-copy">
                <strong>{opt.label}</strong>
                <small>{opt.blurb}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="advanced">
        <button
          className="ghost-button"
          type="button"
          aria-expanded={advancedOpen}
          aria-controls="advanced-body"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <span aria-hidden="true">›</span>
          <span>Advanced</span>
        </button>

        <div
          id="advanced-body"
          className="advanced-body"
          hidden={!advancedOpen}
        >
          <label className="field">
            <span>Model</span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={(e) => void changeModel(e.target.value)}
            />
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() => void resetModel()}
          >
            Reset to default
          </button>
        </div>
      </section>

      <footer className="footer">
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
        >
          Groq keys
        </a>
        <span aria-hidden="true">·</span>
        <span>Runs only on LinkedIn</span>
      </footer>
    </main>
  );
}

export default Popup;
