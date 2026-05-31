const LOG = "[linkednt:sw]";

console.info(`${LOG} service worker started`, {
  at: new Date().toISOString(),
  extensionId: chrome.runtime.id,
});

chrome.runtime.onInstalled.addListener((details) => {
  console.info(`${LOG} onInstalled`, { reason: details.reason });
});

chrome.runtime.onStartup.addListener(() => {
  console.info(`${LOG} onStartup`);
});
