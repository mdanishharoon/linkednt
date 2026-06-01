import type { CustomProvider, ProviderId } from "./providers/types";
import { DEFAULT_SETTINGS, type Mode, type Path, type Settings } from "./types";

const SETTINGS_KEYS = [
  "enabled",
  "mode",
  "path",
  "providerId",
  "apiKeys",
  "models",
  "customProviders",
  // Legacy single-key fields — migrated on first load below.
  "apiKey",
  "model",
] as const;

interface RawStored {
  enabled?: unknown;
  mode?: unknown;
  path?: unknown;
  providerId?: unknown;
  apiKeys?: unknown;
  models?: unknown;
  customProviders?: unknown;
  apiKey?: unknown;
  model?: unknown;
}

export async function getSettings(): Promise<Settings> {
  const raw = (await chrome.storage.local.get(
    SETTINGS_KEYS as unknown as string[],
  )) as RawStored;

  // Migrate legacy single-key fields into the per-provider maps. Runs once;
  // after the first setSettings() the legacy fields stop being read.
  const apiKeys: Record<string, string> = isRecord(raw.apiKeys)
    ? { ...(raw.apiKeys as Record<string, string>) }
    : {};
  const models: Record<string, string> = isRecord(raw.models)
    ? { ...(raw.models as Record<string, string>) }
    : {};

  if (typeof raw.apiKey === "string" && raw.apiKey && !apiKeys.groq) {
    apiKeys.groq = raw.apiKey;
  }
  if (typeof raw.model === "string" && raw.model && !models.groq) {
    models.groq = raw.model;
  }

  const customProviders: CustomProvider[] = Array.isArray(raw.customProviders)
    ? (raw.customProviders as CustomProvider[]).filter(
        (p) => p && typeof p.id === "string" && typeof p.baseUrl === "string",
      )
    : [];

  return {
    enabled: coerceBool(raw.enabled, DEFAULT_SETTINGS.enabled),
    mode: (raw.mode as Mode) || DEFAULT_SETTINGS.mode,
    path: (raw.path as Path) || DEFAULT_SETTINGS.path,
    providerId: (raw.providerId as ProviderId) || DEFAULT_SETTINGS.providerId,
    apiKeys,
    models,
    customProviders,
  };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

/** Set a single API key for a specific provider — merges, doesn't overwrite. */
export async function setApiKey(
  providerId: ProviderId,
  key: string,
): Promise<void> {
  const settings = await getSettings();
  await setSettings({ apiKeys: { ...settings.apiKeys, [providerId]: key } });
}

/** Set a single model for a specific provider — merges, doesn't overwrite. */
export async function setModel(
  providerId: ProviderId,
  model: string,
): Promise<void> {
  const settings = await getSettings();
  await setSettings({ models: { ...settings.models, [providerId]: model } });
}

/** Replace the saved customProviders array. */
export async function setCustomProviders(
  customProviders: CustomProvider[],
): Promise<void> {
  await setSettings({ customProviders });
}

/** Add a new custom provider; returns the saved entry (with its id). */
export async function addCustomProvider(
  provider: CustomProvider,
): Promise<CustomProvider> {
  const s = await getSettings();
  const next = [
    ...s.customProviders.filter((p) => p.id !== provider.id),
    provider,
  ];
  await setSettings({ customProviders: next });
  return provider;
}

/** Remove a custom provider by id. Falls back to the default builtin
 *  provider if the removed one was active. */
export async function removeCustomProvider(id: string): Promise<void> {
  const s = await getSettings();
  const next = s.customProviders.filter((p) => p.id !== id);
  const patch: Partial<Settings> = { customProviders: next };
  if (s.providerId === id) patch.providerId = DEFAULT_SETTINGS.providerId;
  await setSettings(patch);
}

export async function getMode(): Promise<Mode> {
  return (await getSettings()).mode;
}

export async function setMode(mode: Mode): Promise<void> {
  await setSettings({ mode });
}

export function onSettingsChange(
  cb: (changes: Partial<Settings>) => void,
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "local") return;
    const patch: Partial<Settings> = {};
    if (changes.enabled)
      patch.enabled = coerceBool(changes.enabled.newValue, false);
    if (changes.mode) patch.mode = changes.mode.newValue as Mode;
    if (changes.path) patch.path = changes.path.newValue as Path;
    if (changes.providerId)
      patch.providerId = changes.providerId.newValue as ProviderId;
    if (changes.apiKeys)
      patch.apiKeys =
        (changes.apiKeys.newValue as Record<string, string>) ?? {};
    if (changes.models)
      patch.models = (changes.models.newValue as Record<string, string>) ?? {};
    if (changes.customProviders)
      patch.customProviders =
        (changes.customProviders.newValue as CustomProvider[]) ?? [];
    if (Object.keys(patch).length > 0) cb(patch);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
