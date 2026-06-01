const LOG = "[linkednt:sw]";

console.info(`${LOG} service worker started`, {
  at: new Date().toISOString(),
  extensionId: chrome.runtime.id,
});

// The popup used to expose an `enabled` toggle that gated the content script's
// injection logic. We removed the UI but kept the storage field as a
// programmatic kill switch. Force-on at install/update so old installs that
// stored `enabled: false` start working again without the user having to
// rummage in DevTools.
async function migrateEnabled(reason: chrome.runtime.OnInstalledReason) {
  try {
    const { enabled } = (await chrome.storage.local.get("enabled")) as {
      enabled?: unknown;
    };
    if (enabled !== true) {
      await chrome.storage.local.set({ enabled: true });
      console.info(`${LOG} migrated enabled→true`, { reason, was: enabled });
    }
  } catch (err) {
    console.warn(`${LOG} enabled migration failed`, err);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  console.info(`${LOG} onInstalled`, { reason: details.reason });
  void migrateEnabled(details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.info(`${LOG} onStartup`);
});
