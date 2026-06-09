import { sendToBackground } from "@plasmohq/messaging";
import type { PlasmoCSConfig } from "plasmo";

import {
  describeDom,
  describeNode,
  probeSelectors,
  runFullDiagnostic,
  sampleFeedCandidates,
} from "~lib/diagnostics";
import {
  expandPost,
  extractPostText,
  findInjectionTarget,
  findPosts,
  findTextBlock,
} from "~lib/extractor";
import {
  CARD_CLASS,
  type CardContext,
  createErrorCard,
  createLoadingCard,
  createResultCard,
  findCardContainer,
  HIDDEN_ATTR,
  mountCard,
  reshowCard,
  showToast,
  teardownAllCards,
} from "~lib/overlay";
import { getSettings, onSettingsChange } from "~lib/storage";
import type {
  Mode,
  RewriteRequest,
  RewriteResponse,
  Settings,
} from "~lib/types";

import "./linkedin.css";

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/*"],
};

const LOG = "[linkednt:cs]";
const PROCESSED_ATTR = "data-linkedout-processed";
const MIN_TEXT_LENGTH = 24;

const processed = new WeakSet<HTMLElement>();
const warned = new WeakSet<HTMLElement>();

let settings: Settings | null = null;
let observer: MutationObserver | null = null;
let injectQueued = false;
let scanCount = 0;
let totalInjected = 0;
let mutationBatchCount = 0;
let retryIntervalId: number | undefined;
let diagnosticRan = false;
let diagnosticTimer: number | undefined;

const stats = {
  bootstrappedAt: Date.now(),
  scans: 0,
  postsSeen: 0,
  buttonsInjected: 0,
  skippedTooShort: 0,
  skippedNoTarget: 0,
  skippedAlreadyDone: 0,
  rewriteRequests: 0,
  rewriteSuccess: 0,
  rewriteErrors: 0,
  cacheHits: 0,
  lastError: "",
};

// Short-lived in-memory cache. Same post + same mode within the TTL gets an
// instant replace — no API call. Cache lives in the content script's globalThis
// so it's per-tab and dies on page reload, which is the intended "short-lived".
interface CacheEntry {
  rewrite: string;
  expiresAt: number;
}
const REWRITE_CACHE_TTL_MS = 10 * 60 * 1000;
const rewriteCache = new Map<string, CacheEntry>();

function cacheKey(text: string, mode: Mode): string {
  return `${mode}:${text}`;
}

function getCachedRewrite(text: string, mode: Mode): string | null {
  const key = cacheKey(text, mode);
  const entry = rewriteCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rewriteCache.delete(key);
    return null;
  }
  return entry.rewrite;
}

function setCachedRewrite(text: string, mode: Mode, rewrite: string): void {
  rewriteCache.set(cacheKey(text, mode), {
    rewrite,
    expiresAt: Date.now() + REWRITE_CACHE_TTL_MS,
  });
}

void bootstrap();

// Expose a manual debug helper. Available in the ISOLATED world via the DevTools
// "context" picker (top-left of Console), under "linkednt". For probe/sample/dom
// from the regular console, use window.__linkednt__ installed by linkedin-bridge.ts.
(globalThis as unknown as { __linkednt__: unknown }).__linkednt__ = {
  dump: () => ({
    settings,
    observerActive: !!observer,
    stats: { ...stats },
    url: location.href,
  }),
  rescan: () => scheduleInject(),
  findPosts: () => findPosts().length,
  probe: () => probeSelectors(),
  sample: (n = 1) => sampleFeedCandidates(n),
  dom: () => describeDom(),
};

async function bootstrap() {
  try {
    settings = await getSettings();
    info("content script loaded", {
      url: location.href,
      extensionId: chrome.runtime.id,
      readyState: document.readyState,
      settings: {
        enabled: settings.enabled,
        mode: settings.mode,
        path: settings.path,
        providerId: settings.providerId,
        hasApiKey: !!settings.apiKeys[settings.providerId],
        model: settings.models[settings.providerId] || "(provider default)",
      },
    });

    attachSettingsListener();

    if (!settings.enabled) {
      warn("extension disabled — open the popup and flip the toggle to begin");
      return;
    }

    start();
  } catch (err) {
    error("bootstrap failed", err);
  }
}

function start() {
  scheduleInject();
  // Observe document.body (NOT main) so we survive LinkedIn swapping <main>
  // during SPA navigation, and so we catch new feed items from "Load more"
  // regardless of where in the tree they get appended.
  const target = document.body;
  observer = new MutationObserver((mutations) => {
    mutationBatchCount += 1;
    if (mutationBatchCount <= 5) {
      const totalAddedNodes = mutations.reduce(
        (sum, m) => sum + m.addedNodes.length,
        0,
      );
      info("mutation batch", {
        batch: mutationBatchCount,
        mutations: mutations.length,
        addedNodes: totalAddedNodes,
      });
    }
    // scheduleInject is rAF-debounced so spamming it is cheap.
    scheduleInject();
  });
  observer.observe(target, { childList: true, subtree: true });
  info("observer attached", { target: describeNode(target as HTMLElement) });

  // Scroll-driven scan: belt-and-suspenders for "Load more" and infinite
  // scroll. If the observer somehow misses an insertion (or LinkedIn batches
  // mutations in a way we don't catch), scrolling will pick it up within 300ms.
  attachScrollListener();

  // Lazy-load safety net: re-scan every 1s for the first 20s, regardless of
  // observer behaviour. Stops as soon as we successfully inject a button or
  // when the extension is disabled. The 20s cap prevents infinite churn.
  retryIntervalId = window.setInterval(() => {
    if (!settings?.enabled || totalInjected > 0) {
      if (retryIntervalId !== undefined) {
        window.clearInterval(retryIntervalId);
        retryIntervalId = undefined;
        info("retry interval stopped", { totalInjected });
      }
      return;
    }
    info("retry scan (lazy-load safety net)");
    scheduleInject();
  }, 1000);
  window.setTimeout(() => {
    if (retryIntervalId !== undefined) {
      window.clearInterval(retryIntervalId);
      retryIntervalId = undefined;
      info("retry interval timed out after 20s", { totalInjected });
    }
  }, 20000);

  // Automatic diagnostic at 8s if still no injections
  window.setTimeout(() => {
    if (totalInjected === 0 && !diagnosticRan) {
      warn(
        "8s after observer attach, still 0 injections — running full diagnostic",
      );
      diagnosticRan = true;
      runFullDiagnostic();
    }
  }, 8000);
}

function attachSettingsListener() {
  onSettingsChange((patch) => {
    info("settings changed", patch);
    settings = { ...(settings as Settings), ...patch };

    // Any change that affects the rewrite output should invalidate the
    // per-tab cache + dismiss visible cards so the next deslop click
    // refetches with the new config — no reload required.
    const invalidates =
      patch.mode !== undefined ||
      patch.providerId !== undefined ||
      patch.path !== undefined ||
      patch.apiKeys !== undefined ||
      patch.models !== undefined ||
      patch.customProviders !== undefined;
    if (invalidates) {
      rewriteCache.clear();
      teardownAllCards();
      info("cache invalidated by settings change", {
        keys: Object.keys(patch),
      });
    }

    if (patch.enabled === undefined) return;

    if (patch.enabled) {
      if (!observer) start();
      else scheduleInject();
    } else {
      disable();
    }
  });

  // Auth-state reactivity: if the user signs in (or out) from the popup
  // while LinkedIn is open, sweep stale UNAUTHORIZED cards off the page so
  // they don't have to refresh. onSettingsChange skips non-settings keys, so
  // we listen directly on chrome.storage.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const sessionChange = changes["auth.session"];
    if (!sessionChange) return;
    const signedIn = sessionChange.newValue != null;
    info("auth.session changed", { signedIn });
    if (signedIn) {
      document
        .querySelectorAll<HTMLElement>(
          `.${CARD_CLASS}[data-lo-error-code='UNAUTHORIZED']`,
        )
        .forEach((card) => card.remove());
    }
  });
}

function disable() {
  observer?.disconnect();
  observer = null;
  injectQueued = false;

  const buttonCount = document.querySelectorAll(".lo-deslop-btn").length;
  document
    .querySelectorAll<HTMLElement>(".lo-deslop-btn")
    .forEach((b) => b.remove());
  document
    .querySelectorAll<HTMLElement>(".lo-inline-bar")
    .forEach((b) => b.remove());
  teardownAllCards();
  document
    .querySelectorAll<HTMLElement>(`[${PROCESSED_ATTR}='true']`)
    .forEach((el) => el.removeAttribute(PROCESSED_ATTR));

  info("disabled, cleaned up", { buttonsRemoved: buttonCount });
}

function scheduleInject() {
  if (!settings?.enabled) return;
  if (injectQueued) return;
  injectQueued = true;
  window.requestAnimationFrame(() => {
    injectQueued = false;
    try {
      injectButtons();
    } catch (err) {
      error("injectButtons threw", err);
    }
  });
}

let scrollListenerAttached = false;
let scrollScheduled = false;
function attachScrollListener() {
  if (scrollListenerAttached) return;
  scrollListenerAttached = true;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.setTimeout(() => {
        scrollScheduled = false;
        scheduleInject();
      }, 300);
    },
    { passive: true, capture: true },
  );
}

function injectButtons() {
  if (!settings?.enabled) return;

  let posts: HTMLElement[] = [];
  try {
    posts = findPosts();
  } catch (err) {
    error("findPosts threw — likely a selector syntax issue", err);
    return;
  }
  stats.postsSeen = Math.max(stats.postsSeen, posts.length);

  let injected = 0;
  let tooShort = 0;
  let noTarget = 0;
  let alreadyDone = 0;
  const targetSelectors: Record<string, number> = {};

  for (const post of posts) {
    if (processed.has(post) || post.getAttribute(PROCESSED_ATTR) === "true") {
      alreadyDone++;
      continue;
    }

    const text = extractPostText(post);
    if (text.length < MIN_TEXT_LENGTH) {
      tooShort++;
      continue;
    }

    const target = findInjectionTarget(post);
    if (!target) {
      noTarget++;
      warnOnce(post, "no injection target found", {
        textPreview: text.slice(0, 80),
        post: describeNode(post),
      });
      continue;
    }

    post.setAttribute(PROCESSED_ATTR, "true");
    processed.add(post);
    target.appendChild(createButton(post));
    const key = describeNode(target).slice(0, 60);
    targetSelectors[key] = (targetSelectors[key] || 0) + 1;
    injected += 1;
  }

  scanCount += 1;
  stats.scans = scanCount;
  stats.buttonsInjected = totalInjected += injected;
  stats.skippedTooShort += tooShort;
  stats.skippedNoTarget += noTarget;
  stats.skippedAlreadyDone += alreadyDone;

  // Always log first 3 scans; after that only when something happens or every 25th scan
  const shouldLog =
    scanCount <= 3 || injected > 0 || noTarget > 0 || scanCount % 25 === 0;
  if (shouldLog) {
    info("scan", {
      scan: scanCount,
      posts: posts.length,
      injected,
      alreadyDone,
      tooShort,
      noTarget,
      totalInjected,
      targets: targetSelectors,
    });
  }

  if (posts.length === 0 && scanCount <= 3) {
    warn("no posts matched any selector on this scan", { url: location.href });
    scheduleDiagnostic();
  }
}

function scheduleDiagnostic() {
  if (diagnosticRan) return;
  if (diagnosticTimer !== undefined) return;
  // 2s grace period: feed may still be loading
  diagnosticTimer = window.setTimeout(() => {
    diagnosticTimer = undefined;
    if (totalInjected > 0 || diagnosticRan) return;
    diagnosticRan = true;
    info("running diagnostic — selectors found 0 posts on initial scans");
    runFullDiagnostic();
  }, 2000);
}

function createButton(post: HTMLElement): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lo-deslop-btn";
  button.dataset.linkedout = "button";

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";

  const label = document.createElement("span");
  label.textContent = "Deslop";

  button.append(icon, label);
  button.addEventListener("click", () => void deslopPost(post, button));
  return button;
}

async function deslopPost(post: HTMLElement, button: HTMLButtonElement) {
  const mode: Mode = settings?.mode ?? "strip";

  // If a card already exists for this post, just re-show it (cheap toggle path
  // for when the user clicked "Show original" earlier and now wants the rewrite
  // back). No re-fetch, no animation.
  const existingCard = post.querySelector<HTMLElement>(`.${CARD_CLASS}`);
  if (existingCard) {
    const container = post.querySelector<HTMLElement>(
      `[${HIDDEN_ATTR}="true"]`,
    );
    if (container) {
      reshowCard(container, existingCard);
      info("re-show existing card", { post: describeNode(post) });
      return;
    }
    // Card is in DOM but container isn't marked hidden — find the container
    // via the existing card's previous sibling and try again.
    const fallback = existingCard.previousElementSibling as HTMLElement | null;
    if (fallback) {
      reshowCard(fallback, existingCard);
      info("re-show existing card (fallback)", { post: describeNode(post) });
      return;
    }
  }

  const expanded = await expandPost(post);
  info("expand attempt", { expanded });

  const textBlock = findTextBlock(post);
  const postText = extractPostText(post);

  if (!textBlock || postText.length < MIN_TEXT_LENGTH) {
    warn("post text too short after expand", { len: postText.length });
    showToast(post, "Not enough slop to work with.");
    return;
  }

  const container = findCardContainer(textBlock);
  const ctx: CardContext = { hiddenContainer: container };

  // Cache check — instant path. Avoid an API call and the loading state.
  const cached = getCachedRewrite(postText, mode);
  if (cached) {
    stats.cacheHits += 1;
    info("cache hit, instant replace", {
      mode,
      chars: postText.length,
      rewriteChars: cached.length,
    });
    const card = createResultCard(cached, ctx);
    mountCard(container, card);
    return;
  }

  // Cache miss — show loading card, fetch, then replace.
  const loadingCard = createLoadingCard(ctx);
  mountCard(container, loadingCard);
  button.disabled = true;
  button.classList.add("lo-loading");

  stats.rewriteRequests += 1;
  const startedAt = performance.now();
  info("requesting rewrite", { mode, chars: postText.length });

  try {
    const response = await sendToBackground<RewriteRequest, RewriteResponse>({
      name: "rewrite",
      body: { text: postText, mode },
    });

    const ms = Math.round(performance.now() - startedAt);
    if (!response.ok) {
      stats.rewriteErrors += 1;
      stats.lastError = `${response.code}: ${response.error}`;
      error("rewrite error", {
        code: response.code,
        error: response.error,
        ms,
      });
      const errCard = createErrorCard(
        response.error,
        ctx,
        response.code,
        () => {
          errCard.remove();
          void deslopPost(post, button);
        },
      );
      loadingCard.replaceWith(errCard);
    } else {
      stats.rewriteSuccess += 1;
      info("rewrite ok", {
        mode: response.mode,
        ms,
        rewriteChars: response.rewrite.length,
      });
      setCachedRewrite(postText, mode, response.rewrite);
      loadingCard.replaceWith(createResultCard(response.rewrite, ctx));
    }
  } catch (err) {
    stats.rewriteErrors += 1;
    stats.lastError = err instanceof Error ? err.message : String(err);
    error("rewrite threw", err);
    // The absolute last-resort path: not a known error code, something just
    // blew up. The real exception is in the console above; the card stays
    // in character.
    const errCard = createErrorCard(
      "Even linkedn’t tapped out on this bs. Whatever happened is in the console logs.",
      ctx,
      "UNEXPECTED",
      () => {
        errCard.remove();
        void deslopPost(post, button);
      },
    );
    loadingCard.replaceWith(errCard);
  } finally {
    button.disabled = false;
    button.classList.remove("lo-loading");
  }
}

function warnOnce(
  post: HTMLElement,
  message: string,
  details: Record<string, unknown> = {},
) {
  if (warned.has(post)) return;
  warned.add(post);
  console.warn(`${LOG} ${message}`, details);
}

function info(message: string, details: Record<string, unknown> = {}) {
  console.info(`${LOG} ${message}`, details);
}

function warn(message: string, details: Record<string, unknown> = {}) {
  console.warn(`${LOG} ${message}`, details);
}

function error(message: string, err: unknown) {
  console.error(`${LOG} ${message}`, err);
}
