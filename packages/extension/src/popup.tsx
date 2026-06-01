import { sendToBackground } from "@plasmohq/messaging";
import { useEffect, useRef, useState } from "react";

import { listProviders } from "~lib/providers/registry";
import type { BuiltinProviderId } from "~lib/providers/types";
import {
  getSettings,
  setApiKey as saveApiKey,
  setModel as saveModel,
  setSettings,
} from "~lib/storage";
import {
  type Mode,
  type Path,
  type SessionResponse,
  type SessionUserShape,
  type SignInResponse,
  type SignOutResponse,
} from "~lib/types";

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
    value: "roast",
    index: "01",
    label: "Internal Monologue",
    blurb: "What the post sounds like with the performance removed.",
  },
  {
    value: "summarise",
    index: "02",
    label: "Dry Translator",
    blurb: "Plain English, with none of the inspirational packaging.",
  },
  {
    value: "strip",
    index: "03",
    label: "Strip",
    blurb: "Bare facts in one sentence. No hype, no emojis, no hashtags.",
  },
];

const PROVIDERS = listProviders();

// Sentinel value for the "Custom model…" option in the model <select>. Has
// to be a string the user is extremely unlikely to ever paste as a real
// model id.
const CUSTOM_MODEL_VALUE = "__linkednt_custom_model__";

function Popup() {
  const [path, setPath] = useState<Path>("proxy");
  const [providerId, setProviderId] = useState<BuiltinProviderId>("groq");
  const [keyInput, setKeyInput] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [mode, setMode] = useState<Mode>("strip");
  const [flashText, setFlashText] = useState("");
  const flashTimer = useRef<number | undefined>(undefined);
  const [user, setUser] = useState<SessionUserShape | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  useEffect(() => {
    void getSettings().then((s) => {
      console.info(`${LOG} loaded`, {
        enabled: s.enabled,
        path: s.path,
        providerId: s.providerId,
        mode: s.mode,
        keysFor: Object.keys(s.apiKeys),
      });
      setPath(s.path);
      setProviderId(s.providerId as BuiltinProviderId);
      setMode(s.mode);
      const pid = s.providerId as BuiltinProviderId;
      setSavedKey(s.apiKeys[pid] ?? "");
      const p = PROVIDERS.find((q) => q.id === pid);
      setModelInput(s.models[pid] || p?.defaultModel || "");
    });

    void sendToBackground<undefined, SessionResponse>({ name: "session" }).then(
      (r) => setUser(r.user),
    );
  }, []);

  async function handleSignIn() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await sendToBackground<undefined, SignInResponse>({
        name: "sign-in",
      });
      if (result.ok) {
        setUser(result.user);
        flash("Signed in");
        console.info(`${LOG} signed in`, { userId: result.user.id });
      } else if (result.code !== "USER_CANCELLED") {
        setAuthError(result.error);
        console.warn(`${LOG} sign in failed`, result);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await sendToBackground<undefined, SignOutResponse>({ name: "sign-out" });
      setUser(null);
      flash("Signed out");
      console.info(`${LOG} signed out`);
    } finally {
      setAuthBusy(false);
    }
  }

  function flash(message: string) {
    setFlashText(message);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashText(""), 1400);
  }

  async function pickPath(next: Path) {
    setPath(next);
    await setSettings({ path: next });
    flash(next === "proxy" ? "Credits" : "BYOK");
    console.info(`${LOG} path changed`, { path: next });
  }

  async function pickProvider(next: BuiltinProviderId) {
    setProviderId(next);
    await setSettings({ providerId: next });
    const s = await getSettings();
    setSavedKey(s.apiKeys[next] ?? "");
    const p = PROVIDERS.find((q) => q.id === next);
    setModelInput(s.models[next] || p?.defaultModel || "");
    setKeyInput("");
    flash("Saved");
    console.info(`${LOG} provider changed`, { providerId: next });
  }

  async function commitKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      flash("Missing");
      return;
    }
    await saveApiKey(providerId, trimmed);
    setSavedKey(trimmed);
    setKeyInput("");
    flash("Saved");
    console.info(`${LOG} api key saved`, {
      providerId,
      length: trimmed.length,
      prefix: trimmed.slice(0, 4),
    });
  }

  async function commitModel() {
    const trimmed = modelInput.trim() || provider.defaultModel;
    setModelInput(trimmed);
    await saveModel(providerId, trimmed);
    flash("Saved");
    console.info(`${LOG} model saved`, { providerId, model: trimmed });
  }

  async function pickModelSelect(value: string) {
    if (value === CUSTOM_MODEL_VALUE) {
      // Switching INTO custom mode: clear the input so the user starts fresh.
      // Don't commit yet — they need to type something first.
      setModelInput("");
      return;
    }
    setModelInput(value);
    await saveModel(providerId, value);
    flash("Saved");
    console.info(`${LOG} model saved`, { providerId, model: value });
  }

  async function resetModel() {
    setModelInput(provider.defaultModel);
    await saveModel(providerId, provider.defaultModel);
    flash("Reset");
  }

  async function pickMode(next: Mode) {
    setMode(next);
    await setSettings({ mode: next });
    flash("Saved");
    console.info(`${LOG} mode changed`, { mode: next });
  }

  const savedKeySummary = savedKey
    ? `${savedKey.slice(0, 6)}...${savedKey.slice(-4)}`
    : "No key saved";

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="title">
        <div className="mark" aria-hidden="true">
          n<span className="apos">&rsquo;</span>t
        </div>
        <div className="hero-copy">
          <h1 id="title">linkedn&rsquo;t</h1>
          <p className="tagline">Unslop your LinkedIn feed.</p>
        </div>
      </section>

      {/* Path picker — segmented control, both options visible side-by-side. */}
      <section
        className="panel"
        aria-labelledby="path-title"
        style={{ paddingBottom: 9 }}
      >
        <div className="section-head tight">
          <div>
            <h2 id="path-title">How rewrites happen</h2>
            <p className="summary">
              Both work. Credits keep keys off your machine.
            </p>
          </div>
          <span className="save-state" aria-live="polite">
            {flashText}
          </span>
        </div>

        <div className="segmented" role="tablist" aria-label="Rewrite path">
          <button
            type="button"
            role="tab"
            aria-selected={path === "proxy"}
            className={`segmented-btn ${path === "proxy" ? "is-active" : ""}`}
            onClick={() => void pickPath("proxy")}
          >
            Use credits
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={path === "byok"}
            className={`segmented-btn ${path === "byok" ? "is-active" : ""}`}
            onClick={() => void pickPath("byok")}
          >
            Bring own key
          </button>
        </div>
      </section>

      {path === "proxy" ? (
        <section className="panel" aria-labelledby="credits-title">
          <div className="section-head tight">
            <div>
              <h2 id="credits-title">Credits</h2>
              <p className="summary">
                {user
                  ? `Signed in as ${user.email ?? "Google account"}.`
                  : "Sign in to start the free trial — 30 rewrites on us."}
              </p>
            </div>
          </div>

          {user ? (
            <button
              className="text-button"
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
            >
              Sign out
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignIn()}
            >
              <span className="button-icon" aria-hidden="true">
                +
              </span>
              {authBusy ? "Signing in…" : "Sign in with Google"}
            </button>
          )}

          {authError && (
            <p className="key-status" role="alert" style={{ color: "#b3261e" }}>
              {authError}
            </p>
          )}

          <p className="honest-note">
            <strong>Honest note:</strong> Credits run on a tiny margin (a few
            cents over cost). Feel free to support the project — or stay on
            Bring own key, no hard feelings.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="byok-title">
          <div className="section-head tight">
            <div>
              <h2 id="byok-title">Your provider</h2>
              <p className="summary">
                The key never leaves this browser. Calls go straight to the
                provider.
              </p>
            </div>
          </div>

          <label className="field">
            <span>Provider</span>
            <select
              value={providerId}
              onChange={(e) =>
                void pickProvider(e.target.value as BuiltinProviderId)
              }
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>API key</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.keyPlaceholder}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitKey();
              }}
            />
            <small className="key-status">
              On file: {savedKeySummary}{" "}
              <a href={provider.consoleUrl} target="_blank" rel="noreferrer">
                Get one →
              </a>
            </small>
          </label>

          <button
            className="primary-button"
            type="button"
            onClick={() => void commitKey()}
          >
            <span className="button-icon" aria-hidden="true">
              +
            </span>
            Save key
          </button>

          <label className="field" style={{ marginTop: 10 }}>
            <span>Model</span>
            <select
              value={
                provider.modelSuggestions.includes(modelInput)
                  ? modelInput
                  : CUSTOM_MODEL_VALUE
              }
              onChange={(e) => void pickModelSelect(e.target.value)}
            >
              {provider.modelSuggestions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={CUSTOM_MODEL_VALUE}>Custom model…</option>
            </select>
          </label>

          {!provider.modelSuggestions.includes(modelInput) && (
            <label className="field" style={{ marginTop: 6 }}>
              <span>Custom model ID</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="provider/model-name"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onBlur={() => void commitModel()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitModel();
                }}
              />
            </label>
          )}

          <button
            className="text-button"
            type="button"
            onClick={() => void resetModel()}
          >
            Reset to {provider.defaultModel}
          </button>
        </section>
      )}

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

      <footer className="footer">
        <a href="https://linkednt.com" target="_blank" rel="noreferrer">
          linkednt.com
        </a>
        <span aria-hidden="true">·</span>
        <span>Runs only on LinkedIn</span>
      </footer>
    </main>
  );
}

export default Popup;
