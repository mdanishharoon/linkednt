import { DEFAULT_SETTINGS, type Mode, type Settings } from "./types";

const SETTINGS_KEYS = ["enabled", "mode", "apiKey", "model"] as const;

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.local.get(
    SETTINGS_KEYS as unknown as string[],
  );
  return {
    enabled: coerceBool(raw.enabled, DEFAULT_SETTINGS.enabled),
    mode: (raw.mode as Mode) || DEFAULT_SETTINGS.mode,
    apiKey: (raw.apiKey as string) || DEFAULT_SETTINGS.apiKey,
    model: (raw.model as string) || DEFAULT_SETTINGS.model,
  };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
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
    if (changes.apiKey)
      patch.apiKey = (changes.apiKey.newValue as string) ?? "";
    if (changes.model)
      patch.model =
        (changes.model.newValue as string) ?? DEFAULT_SETTINGS.model;
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
