// Current LinkedIn (May 2026): data-urn was removed entirely. Posts are now
// identified by [role="listitem"] containing a feed-commentary componentkey
// or an expandable-text-box data-testid. CSS class names are fully obfuscated
// (CSS modules) so attribute-based selectors are the only stable path.
const POST_SELECTORS = [
  // Confirmed working as of 2026-05-31
  '[role="listitem"]:has([componentkey^="feed-commentary"])',
  '[role="listitem"]:has([data-testid="expandable-text-box"])',
  '[role="listitem"][componentkey*="FeedType_"]',
  // Older patterns retained as forward-compat fallbacks in case LinkedIn rolls back
  ".feed-shared-update-v2",
  '[data-urn*="activity"]',
  "div[data-id^='urn:li:activity']",
] as const;

const TEXT_SELECTORS = [
  // Current
  '[componentkey^="feed-commentary"]',
  '[data-testid="expandable-text-box"]',
  // Older
  ".feed-shared-update-v2__description",
  ".update-components-text",
  ".feed-shared-inline-show-more-text",
  "[data-test-id='main-feed-activity-card'] .break-words",
] as const;

const ACTION_SELECTORS = [
  // Speculative current selectors — probes; safe to keep even if 0-match
  '[componentkey*="SocialActions"]',
  '[componentkey*="ReactionButton"]',
  '[componentkey*="CommentTools"]',
  '[componentkey*="social"]',
  // Older
  ".feed-shared-social-action-bar",
  ".social-details-social-actions",
  ".feed-shared-social-actions",
  ".update-v2-social-activity",
  "[data-test-id='social-actions']",
  ".social-actions",
  '[componentkey*="replaceableCommentTools"]',
] as const;

export const POST_PROCESSED_FLAG = "linkedoutProcessed";
export const INLINE_BAR_CLASS = "lo-inline-bar";

export function findPosts(root: ParentNode = document): HTMLElement[] {
  const matches = new Set<HTMLElement>();
  for (const selector of POST_SELECTORS) {
    if (root instanceof HTMLElement && root.matches(selector)) {
      matches.add(root);
    }
    root
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => matches.add(el));
  }
  return Array.from(matches);
}

export function hasPotentialPostNode(nodes: NodeList): boolean {
  for (const node of Array.from(nodes)) {
    if (!(node instanceof HTMLElement)) continue;
    for (const selector of POST_SELECTORS) {
      if (node.matches(selector) || node.querySelector(selector)) return true;
    }
  }
  return false;
}

export function findTextBlock(post: HTMLElement): HTMLElement | null {
  for (const selector of TEXT_SELECTORS) {
    const block = post.querySelector<HTMLElement>(selector);
    if (block && (block.innerText ?? "").trim().length > 0) return block;
  }
  return null;
}

export function extractPostText(post: HTMLElement): string {
  const block = findTextBlock(post);
  return (block?.innerText ?? "").replace(/\s+/g, " ").trim();
}

export function findInjectionTarget(post: HTMLElement): HTMLElement | null {
  for (const selector of ACTION_SELECTORS) {
    const bar = post.querySelector<HTMLElement>(selector);
    if (bar) return bar;
  }

  const heuristic = findActionBarByButtons(post);
  if (heuristic) return heuristic;

  const textBlock = findTextBlock(post);
  const parent = textBlock?.parentElement;
  if (!parent) return null;

  const existing = post.querySelector<HTMLElement>(`.${INLINE_BAR_CLASS}`);
  if (existing) return existing;

  const inlineBar = document.createElement("div");
  inlineBar.className = INLINE_BAR_CLASS;
  parent.insertAdjacentElement("afterend", inlineBar);
  return inlineBar;
}

function findActionBarByButtons(post: HTMLElement): HTMLElement | null {
  const buttons = Array.from(
    post.querySelectorAll<HTMLElement>("button, a[aria-label]"),
  );
  const actionButton = buttons.find((btn) => {
    const label = (
      btn.getAttribute("aria-label") ||
      btn.innerText ||
      ""
    ).toLowerCase();
    return (
      label.includes("react") ||
      label.includes("comment") ||
      label.includes("repost") ||
      label.includes("send") ||
      label.includes("like")
    );
  });
  if (!actionButton) return null;

  let node: HTMLElement | null = actionButton.parentElement;
  while (node && node !== post) {
    const labels = Array.from(
      node.querySelectorAll<HTMLElement>("button, a[aria-label]"),
    )
      .map((btn) =>
        (btn.getAttribute("aria-label") || btn.innerText || "").toLowerCase(),
      )
      .filter(Boolean);

    const hasComment = labels.some((l) => l.includes("comment"));
    const hasRepost = labels.some((l) => l.includes("repost"));
    const hasSend = labels.some((l) => l.includes("send"));
    const hasReaction = labels.some((l) => l.includes("react"));

    if (
      [hasComment, hasRepost, hasSend, hasReaction].filter(Boolean).length >= 2
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return actionButton.parentElement;
}

export async function expandPost(post: HTMLElement): Promise<boolean> {
  // Strategy 1: LinkedIn's current expandable-text-button data-testid
  // (the button has pointer-events:none + aria-hidden but programmatic
  // .click() bypasses those and fires the React handler).
  const byTestId = post.querySelector<HTMLElement>(
    '[data-testid="expandable-text-button"]',
  );
  if (byTestId) {
    byTestId.click();
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return true;
  }

  // Strategy 2: any clickable element with see-more / show-more / read-more text.
  const expanders = Array.from(
    post.querySelectorAll<HTMLElement>(
      "button, span[role='button'], a[role='button']",
    ),
  ).filter((el) => {
    const label = (
      el.innerText ||
      el.getAttribute("aria-label") ||
      ""
    ).toLowerCase();
    return (
      label.includes("see more") ||
      label.includes("show more") ||
      label.includes("read more") ||
      /…\s*more/.test(label) ||
      /\.\.\.\s*more/.test(label) ||
      label.trim() === "more"
    );
  });
  const expander = expanders[0];
  if (!expander) return false;
  expander.click();
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return true;
}
