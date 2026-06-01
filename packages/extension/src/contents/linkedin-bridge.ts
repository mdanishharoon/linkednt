import type { PlasmoCSConfig } from "plasmo";

import {
  describeDom,
  probeSelectors,
  sampleFeedCandidates,
} from "~lib/diagnostics";

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/*"],
  world: "MAIN",
};

// This script runs in the LinkedIn page's main JS world (NOT the content-script
// isolated world). That means `window` here IS the page's window, so anything we
// attach to it is visible from the regular DevTools console.
//
// Limitations: no access to chrome.* APIs and no access to the isolated-world
// content script's state (settings, stats, observer). Diagnostics here are pure
// DOM queries — no chrome dependency, so they work fine.
(window as unknown as { __linkednt__: unknown }).__linkednt__ = {
  probe: () => probeSelectors(),
  sample: (n = 1) => sampleFeedCandidates(n),
  dom: () => describeDom(),
};

console.info(
  "[linkednt:bridge] page-world diagnostics installed — try __linkednt__.probe() in this console",
);
