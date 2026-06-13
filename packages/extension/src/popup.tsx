import { sendToBackground } from "@plasmohq/messaging";
import { Fragment, useEffect, useId, useRef, useState } from "react";

import { SandboxBadge } from "~components/SandboxBadge";
import { isCustomProviderId, newCustomProviderId } from "~lib/providers/custom";
import { listAllProviders, listProviders } from "~lib/providers/registry";
import type { CustomProvider } from "~lib/providers/types";
import { SITE_URL } from "~lib/supabase-config";
import {
  addCustomProvider,
  getSettings,
  removeCustomProvider,
  setApiKey as saveApiKey,
  setModel as saveModel,
  setSettings,
} from "~lib/storage";
import {
  type AccountStatusResponse,
  type AccountStatusShape,
  type Mode,
  type Path,
  type SessionResponse,
  type SessionUserShape,
  type SignInResponse,
  type SignOutResponse,
} from "~lib/types";

import "./popup.css";

const LOG = "[linkednt:popup]";

type View = "onboarding" | "home" | "settings";

interface ModeOption {
  value: Mode;
  label: string;
  blurb: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "roast",
    label: "The Group Chat",
    blurb: "How this post reads when it's screenshotted into the group chat.",
  },
  {
    value: "summarise",
    label: "Touch Grass",
    blurb: "Plain English for people who go outside.",
  },
  {
    value: "strip",
    label: "TL;DR",
    blurb: "What happened, in one line. No lessons learned.",
  },
];

// Picking a voice confirms in that voice. Deadpan, one beat, gone.
const MODE_FLASH: Record<Mode, string> = {
  roast: "Screenshotted.",
  summarise: "Grass touched.",
  strip: "Short.",
};

const BUILTIN_PROVIDERS = listProviders();

// Sentinel values used in <select>s to distinguish "real" entries from the
// "Custom model…" / "+ Add custom provider…" escape hatches.
const CUSTOM_MODEL_VALUE = "__lo_custom_model__";
const ADD_CUSTOM_PROVIDER_VALUE = "__lo_add_custom_provider__";

function Popup() {
  // ---- view + settings state ----
  const [view, setView] = useState<View>("home");
  const [path, setPath] = useState<Path>("proxy");
  const [providerId, setProviderId] = useState<string>("groq");
  const [keyInput, setKeyInput] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [mode, setMode] = useState<Mode>("roast");
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [flashText, setFlashText] = useState("");
  const flashTimer = useRef<number | undefined>(undefined);

  // ---- auth state ----
  const [user, setUser] = useState<SessionUserShape | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ---- account / credits state ----
  const [status, setStatus] = useState<AccountStatusShape | null>(null);

  // ---- custom-provider draft (Settings view inline form) ----
  const [editingCustom, setEditingCustom] = useState<CustomProvider | null>(
    null,
  );

  // ---- key visibility ----
  const [showFullKey, setShowFullKey] = useState(false);

  const allProviders = listAllProviders(customProviders);
  const provider =
    allProviders.find((p) => p.id === providerId) ?? allProviders[0];
  const isCustom = isCustomProviderId(provider?.id ?? "");
  const activeCustom = isCustom
    ? customProviders.find((c) => c.id === provider.id)
    : null;

  // ---- initial load ----
  useEffect(() => {
    console.info(
      "%cn't%c Inspecting the popup? Very “always learning” of you.",
      "background:#0a66c2;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700",
      "color:inherit",
    );
    void (async () => {
      const s = await getSettings();
      console.info(`${LOG} loaded`, {
        enabled: s.enabled,
        path: s.path,
        providerId: s.providerId,
        mode: s.mode,
        keysFor: Object.keys(s.apiKeys),
        customs: s.customProviders.length,
      });
      setPath(s.path);
      setProviderId(s.providerId);
      setMode(s.mode);
      setCustomProviders(s.customProviders);
      hydrateProviderState(s.providerId, s);

      const sess = await sendToBackground<undefined, SessionResponse>({
        name: "session",
      });
      setUser(sess.user);

      const hasAnyKey =
        Object.values(s.apiKeys).some((k) => k && k.length > 0) ||
        s.customProviders.some((c) => c.apiKey && c.apiKey.length > 0);

      // First-time landing: no session, no keys → onboarding. Anything else
      // starts on Home so returning users go straight to the credits + mode
      // selector they came for.
      if (!sess.user && !hasAnyKey) {
        setView("onboarding");
      }

      // Kick off a status fetch in the background. Cached values come back
      // instantly, fresh ones replace.
      void refreshStatus();
    })();

    // React to sign-in/out that happens outside the popup (rare, but the
    // SW could theoretically dispatch it during onboarding background work).
    const onStorage = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area !== "local") return;
      if (changes["auth.session"]) {
        const next = changes["auth.session"].newValue;
        setUser(next?.user ?? null);
        if (!next) setStatus(null);
      }
      if (changes["account.status"]) {
        const next = changes["account.status"].newValue;
        setStatus(next ?? null);
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, []);

  function hydrateProviderState(
    pid: string,
    s: Awaited<ReturnType<typeof getSettings>>,
  ) {
    if (isCustomProviderId(pid)) {
      const c = s.customProviders.find((x) => x.id === pid);
      setSavedKey(c?.apiKey ?? "");
      setModelInput(c?.model ?? "");
    } else {
      const p = BUILTIN_PROVIDERS.find((q) => q.id === pid);
      setSavedKey(s.apiKeys[pid] ?? "");
      setModelInput(s.models[pid] || p?.defaultModel || "");
    }
    setKeyInput("");
    setShowFullKey(false);
  }

  async function refreshStatus(force = false) {
    const res = await sendToBackground<
      { force?: boolean },
      AccountStatusResponse
    >({ name: "account-status", body: { force } });
    if (res.ok) setStatus(res.status);
  }

  function flash(message: string) {
    setFlashText(message);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashText(""), 1400);
  }

  // ---- actions ----

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
        await refreshStatus(true);
        setView("home");
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
      setStatus(null);
      flash("Signed out");
      console.info(`${LOG} signed out`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function pickPath(next: Path) {
    setPath(next);
    await setSettings({ path: next });
    flash(next === "proxy" ? "Credits" : "BYOK");
  }

  async function pickProvider(next: string) {
    if (next === ADD_CUSTOM_PROVIDER_VALUE) {
      setEditingCustom({
        id: newCustomProviderId(),
        label: "",
        baseUrl: "",
        apiKey: "",
        model: "",
      });
      return;
    }
    setProviderId(next);
    await setSettings({ providerId: next });
    const s = await getSettings();
    hydrateProviderState(next, s);
    flash("Saved");
    console.info(`${LOG} provider changed`, { providerId: next });
  }

  async function commitKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      flash("Missing");
      return;
    }
    if (isCustom && activeCustom) {
      const updated = { ...activeCustom, apiKey: trimmed };
      await addCustomProvider(updated);
      setCustomProviders((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } else {
      await saveApiKey(providerId, trimmed);
    }
    setSavedKey(trimmed);
    setKeyInput("");
    flash("Saved");
  }

  async function pickModelSelect(value: string) {
    if (value === CUSTOM_MODEL_VALUE) {
      setModelInput("");
      return;
    }
    setModelInput(value);
    await persistModel(value);
    flash("Saved");
  }

  async function commitModel() {
    const trimmed = modelInput.trim() || provider.defaultModel;
    setModelInput(trimmed);
    await persistModel(trimmed);
    flash("Saved");
  }

  async function persistModel(value: string) {
    if (isCustom && activeCustom) {
      const updated = { ...activeCustom, model: value };
      await addCustomProvider(updated);
      setCustomProviders((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } else {
      await saveModel(providerId, value);
    }
  }

  async function resetModel() {
    const d = provider.defaultModel;
    setModelInput(d);
    await persistModel(d);
    flash("Reset");
  }

  async function pickMode(next: Mode) {
    setMode(next);
    await setSettings({ mode: next });
    flash(MODE_FLASH[next] ?? "Saved");
  }

  // ---- custom provider draft handlers ----

  async function saveCustomDraft() {
    if (!editingCustom) return;
    const draft: CustomProvider = {
      id: editingCustom.id,
      label: editingCustom.label.trim() || "Custom",
      baseUrl: editingCustom.baseUrl.trim(),
      apiKey: editingCustom.apiKey,
      model: editingCustom.model.trim(),
    };
    if (!draft.baseUrl || !draft.model) {
      flash("Need URL + model");
      return;
    }
    await addCustomProvider(draft);
    await setSettings({ providerId: draft.id });
    const s = await getSettings();
    setCustomProviders(s.customProviders);
    setProviderId(draft.id);
    hydrateProviderState(draft.id, s);
    setEditingCustom(null);
    flash("Custom saved");
    console.info(`${LOG} custom saved`, {
      id: draft.id,
      baseUrl: draft.baseUrl,
    });
  }

  async function deleteCustomProvider(id: string) {
    await removeCustomProvider(id);
    const s = await getSettings();
    setCustomProviders(s.customProviders);
    setProviderId(s.providerId);
    hydrateProviderState(s.providerId, s);
    flash("Removed");
  }

  // ---- derived bits ----

  const savedKeyPreview = savedKey
    ? `${savedKey.slice(0, 6)}…${savedKey.slice(-4)}`
    : "No key saved";
  const savedKeyShown = showFullKey && savedKey ? savedKey : savedKeyPreview;

  // ============================================================
  // VIEWS
  // ============================================================

  if (view === "onboarding") {
    return (
      <main className="shell shell-centered">
        <div className="onboarding">
          <div className="mark mark-lg" aria-hidden="true">
            n<span className="apos">&rsquo;</span>t
          </div>
          <h1 className="onb-title">Welcome to linkedn&rsquo;t</h1>
          <p className="onb-tagline">Unslop your LinkedIn feed.</p>

          <button
            className="primary-button"
            type="button"
            disabled={authBusy}
            onClick={() => void handleSignIn()}
          >
            {authBusy ? "Signing in…" : "Sign in for 30 free rewrites"}
          </button>

          <p className="onb-divider">
            <span>or</span>
          </p>

          <button
            className="text-button onb-byok"
            type="button"
            onClick={async () => {
              await pickPath("byok");
              setView("settings");
            }}
          >
            Use my own API key →
          </button>

          {authError && (
            <p className="key-status key-status-error" role="alert">
              {authError}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (view === "settings") {
    return (
      <main className="shell">
        <header className="topbar">
          <button
            className="iconbtn"
            type="button"
            onClick={() => setView("home")}
            aria-label="Back to home"
          >
            ←
          </button>
          <span className="topbar-title">Settings</span>
          <span className="save-state" aria-live="polite">
            {flashText}
          </span>
        </header>

        {/* Account */}
        <section className="panel" aria-labelledby="account-title">
          <div className="section-head tight">
            <div>
              <h2 id="account-title">Account</h2>
              <p className="summary">
                {user
                  ? `Signed in as ${user.email ?? "Google account"}.`
                  : "Sign in to use credits."}
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
              {authBusy ? "Signing in…" : "Sign in with Google"}
            </button>
          )}
          {authError && (
            <p className="key-status key-status-error" role="alert">
              {authError}
            </p>
          )}
        </section>

        {/* BYOK config */}
        <section className="panel" aria-labelledby="byok-title">
          <div className="section-head tight">
            <div>
              <h2 id="byok-title">Bring own key</h2>
              <p className="summary">
                Keys never leave this browser. Calls go direct to the provider.
              </p>
            </div>
          </div>

          <div className="field">
            <span id="provider-label">Provider</span>
            <Dropdown
              labelledBy="provider-label"
              value={providerId}
              options={[
                ...BUILTIN_PROVIDERS.map((p) => ({
                  value: p.id,
                  label: p.label,
                  group: "Built-in",
                })),
                ...customProviders.map((p) => ({
                  value: p.id,
                  label: p.label,
                  group: "Custom",
                })),
                {
                  value: ADD_CUSTOM_PROVIDER_VALUE,
                  label: "+ Add custom provider…",
                  action: true,
                },
              ]}
              onChange={(v) => void pickProvider(v)}
            />
          </div>

          {/* Inline custom-provider draft form */}
          {editingCustom && (
            <CustomDraftForm
              draft={editingCustom}
              onChange={setEditingCustom}
              onSave={() => void saveCustomDraft()}
              onCancel={() => setEditingCustom(null)}
            />
          )}

          {!editingCustom && (
            <>
              <label className="field">
                <span>API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={provider?.keyPlaceholder ?? ""}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitKey();
                  }}
                />
                <small className="key-status">
                  <span className="key-status-line">
                    <span className="key-status-label">On file:</span>{" "}
                    <span className="key-status-value">{savedKeyShown}</span>
                    {savedKey && (
                      <button
                        type="button"
                        className="key-reveal"
                        onClick={() => setShowFullKey((v) => !v)}
                        aria-pressed={showFullKey}
                      >
                        {showFullKey ? "Hide" : "Reveal"}
                      </button>
                    )}
                  </span>
                  {provider?.consoleUrl && (
                    <a
                      className="key-console"
                      href={provider.consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get one →
                    </a>
                  )}
                </small>
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={() => void commitKey()}
              >
                Save key
              </button>

              <div className="field">
                <span id="model-label">Model</span>
                <Dropdown
                  labelledBy="model-label"
                  value={
                    provider?.modelSuggestions.includes(modelInput)
                      ? modelInput
                      : CUSTOM_MODEL_VALUE
                  }
                  options={[
                    ...(provider?.modelSuggestions ?? []).map((m) => ({
                      value: m,
                      label: m,
                    })),
                    { value: CUSTOM_MODEL_VALUE, label: "Custom model…" },
                  ]}
                  onChange={(v) => void pickModelSelect(v)}
                />
              </div>

              {!provider?.modelSuggestions.includes(modelInput) && (
                <label className="field">
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

              <div className="row-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => void resetModel()}
                >
                  Reset to {provider?.defaultModel}
                </button>
                {isCustom && activeCustom && (
                  <button
                    className="text-button danger"
                    type="button"
                    onClick={() => void deleteCustomProvider(activeCustom.id)}
                  >
                    Remove this custom
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <footer className="footer footer-centered">
          <a href="https://linkednt.com" target="_blank" rel="noreferrer">
            linkednt.com
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://linkednt.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy
          </a>
        </footer>
      </main>
    );
  }

  // ============================================================
  // HOME VIEW
  // ============================================================

  const showProxyHero = path === "proxy";
  const isSignedIn = user != null;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="mark" aria-hidden="true">
          n<span className="apos">&rsquo;</span>t
        </div>
        <span className="topbar-title">linkedn&rsquo;t</span>
        <span className="save-state" aria-live="polite">
          {flashText}
        </span>
        <button
          className="iconbtn"
          type="button"
          onClick={() => setView("settings")}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>

      {/* Credits / status hero */}
      <section className="credits-hero" aria-label="Account status">
        {showProxyHero && isSignedIn && status && (
          <CreditsBlock status={status} userId={user?.id ?? null} />
        )}
        {showProxyHero && isSignedIn && !status && (
          <div
            className="credits-skeleton"
            role="status"
            aria-label="Loading credits"
          >
            <span className="skeleton skeleton-number" />
            <span className="skeleton skeleton-line" />
          </div>
        )}
        {showProxyHero && !isSignedIn && (
          <div className="credits-cta">
            <h2 id="credits-title">Sign in for 30 free rewrites</h2>
            <button
              className="primary-button"
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignIn()}
            >
              {authBusy ? "Signing in…" : "Sign in with Google"}
            </button>
            {authError && (
              <p className="key-status key-status-error" role="alert">
                {authError}
              </p>
            )}
          </div>
        )}
        {!showProxyHero && (
          <div className={`byok-hero${savedKey ? " has-key" : ""}`}>
            <svg className="byok-key" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="7.5"
                cy="12"
                r="3.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M10.75 12H20M16.5 12v3.2M20 12v2.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <p className="byok-provider">{provider?.label}</p>
            {modelInput && <p className="byok-model">{modelInput}</p>}
            {savedKey ? (
              <span className="byok-chip">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3 8.5l3.2 3.2L13 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Key on file
              </span>
            ) : (
              <button
                className="byok-add"
                type="button"
                onClick={() => setView("settings")}
              >
                Add a key →
              </button>
            )}
          </div>
        )}
      </section>

      {/* Mode selector */}
      <section className="panel" aria-labelledby="mode-title">
        <div className="section-head tight">
          <div>
            <h2 id="mode-title">Translation voice</h2>
            <p className="summary">Choose how blunt you want it.</p>
          </div>
        </div>

        <div
          className="mode-list"
          role="radiogroup"
          aria-label="Translation mode"
        >
          {MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="mode-row">
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => void pickMode(opt.value)}
              />
              <span
                className={`mode-viz mode-viz-${opt.value}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
              <span className="mode-copy">
                <strong>{opt.label}</strong>
                <small>{opt.blurb}</small>
              </span>
              <svg
                className="mode-check"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 8.5l3.2 3.2L13 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          ))}
        </div>
      </section>

      {/* Path toggle (kept on Home for quick switching) */}
      <section className="panel compact-panel" aria-label="Rewrite path">
        <div className="segmented" role="tablist">
          <span
            className={`segmented-thumb${path === "byok" ? " at-2" : ""}`}
            aria-hidden="true"
          />
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

      <footer className="footer footer-centered">
        <a href="https://linkednt.com" target="_blank" rel="noreferrer">
          linkednt.com
        </a>
      </footer>
    </main>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface DropdownOption {
  value: string;
  label: string;
  group?: string;
  action?: boolean;
}

/** Custom select: button trigger + popover listbox, replacing the native
 *  <select> menu. Keyboard: arrows / Home / End / Enter / Esc. Flips upward
 *  when there isn't room below (the popup window can't grow for overlays). */
function Dropdown({
  value,
  options,
  onChange,
  labelledBy,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  labelledBy: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [hl, setHl] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    setOpenUp(
      !!rect && window.innerHeight - rect.bottom < 190 && rect.top > 190,
    );
    setHl(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function close(focusTrigger = false) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function commit(index: number) {
    const opt = options[index];
    if (!opt) return;
    close(true);
    onChange(opt.value);
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-opt-${hl}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, hl, id]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHl(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHl(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(hl);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === " "
    ) {
      e.preventDefault();
      openMenu();
    }
  }

  let lastGroup: string | undefined;

  return (
    <div className="dd" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelledBy}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="dd-value">{selected?.label ?? ""}</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className={`dd-menu${openUp ? " dd-menu-up" : ""}`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          aria-activedescendant={`${id}-opt-${hl}`}
          onKeyDown={onMenuKeyDown}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          {options.map((opt, i) => {
            const header =
              opt.group && opt.group !== lastGroup ? opt.group : null;
            lastGroup = opt.group;
            return (
              <Fragment key={opt.value}>
                {header && <div className="dd-group">{header}</div>}
                <div
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`dd-option${i === hl ? " is-hl" : ""}${opt.action ? " is-action" : ""}`}
                  onMouseEnter={() => setHl(i)}
                  onClick={() => commit(i)}
                >
                  <span className="dd-option-label">{opt.label}</span>
                  {opt.value === value && (
                    <svg
                      className="dd-option-check"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8.5l3.2 3.2L13 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreditsBlock({
  status,
  userId,
}: {
  status: AccountStatusShape;
  userId: string | null;
}) {
  const free = Math.max(0, status.freeRemaining);
  const paid = Math.max(0, status.paidBalance);
  const total = free + paid;

  // Pricing page on the landing knows how to take the user_id from the query
  // string and forward it into the Polar checkout metadata. Falls back to
  // the bare pricing URL if we somehow don't have a user id yet. SITE_URL is
  // env-driven (PLASMO_PUBLIC_SITE_URL) so a sandbox build sends the user to
  // the sandbox landing + sandbox checkout, not prod.
  const pricingUrl = userId
    ? `${SITE_URL}/pricing?user_id=${encodeURIComponent(userId)}`
    : `${SITE_URL}/pricing`;

  return (
    <div className="credits-block">
      <div className="credits-number">{total}</div>
      <div className="credits-sub">
        {free > 0 && paid > 0
          ? `${free} free + ${paid} paid rewrites left`
          : free > 0
            ? `free rewrites left of 30`
            : paid > 0
              ? `paid rewrites left`
              : "Humbled to announce: out of credits."}
      </div>
      <a
        href={pricingUrl}
        target="_blank"
        rel="noreferrer"
        className="credits-buy"
      >
        {paid > 0 ? "Top up credits →" : "Buy credits →"}
      </a>
    </div>
  );
}

function CustomDraftForm(props: {
  draft: CustomProvider;
  onChange: (next: CustomProvider) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { draft, onChange, onSave, onCancel } = props;
  return (
    <div className="custom-draft">
      <label className="field">
        <span>Label</span>
        <input
          type="text"
          value={draft.label}
          placeholder="e.g. Local Ollama"
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Base URL (chat completions)</span>
        <input
          type="text"
          value={draft.baseUrl}
          placeholder="http://localhost:11434/v1/chat/completions"
          onChange={(e) => onChange({ ...draft, baseUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>API key (optional for local)</span>
        <input
          type="password"
          autoComplete="off"
          value={draft.apiKey}
          onChange={(e) => onChange({ ...draft, apiKey: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Default model</span>
        <input
          type="text"
          value={draft.model}
          placeholder="e.g. llama3.2"
          onChange={(e) => onChange({ ...draft, model: e.target.value })}
        />
      </label>
      <div className="row-actions">
        <button className="primary-button" type="button" onClick={onSave}>
          Save custom provider
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PopupRoot() {
  return (
    <>
      <Popup />
      <SandboxBadge />
    </>
  );
}
