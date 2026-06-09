export const CARD_CLASS = "lo-card";
export const HIDDEN_ATTR = "data-linkednt-hidden";
export const TOAST_CLASS = "lo-toast";

export interface CardContext {
  // The element that wraps the original post text — gets hidden when the card
  // is showing, restored when "Show original" is clicked.
  hiddenContainer: HTMLElement;
}

/**
 * Walks up from a text node to find the smallest block-level ancestor that
 * makes sense to hide/replace with the rewrite card. We need a block element
 * because inserting a <div class="lo-card"> as a sibling of an inline span
 * inside a <p> would be invalid HTML.
 */
export function findCardContainer(textBlock: HTMLElement): HTMLElement {
  const block = textBlock.closest<HTMLElement>("p, div, section, article");
  return block ?? textBlock;
}

/**
 * Inserts the card right after the hidden container and hides the container.
 * Caller must build the card via createLoadingCard / createResultCard / createErrorCard
 * with the same hiddenContainer reference so the Show original button works.
 */
export function mountCard(container: HTMLElement, card: HTMLElement): void {
  container.parentElement?.insertBefore(card, container.nextSibling);
  hideContainer(container);
}

export function hideContainer(container: HTMLElement): void {
  container.setAttribute(HIDDEN_ATTR, "true");
  container.style.display = "none";
}

export function showContainer(container: HTMLElement): void {
  container.removeAttribute(HIDDEN_ATTR);
  container.style.removeProperty("display");
}

// Shown while the rewrite is in flight; one is picked at random per deslop.
// Static strings only — they're interpolated into innerHTML below.
const LOADING_LINES = [
  "linkednt is reading between the line breaks",
  "linkednt is removing the journey from this post",
  "linkednt is counting the 🙏s",
  "linkednt is locating the actual news",
  "linkednt is unpacking “humbled”",
  "linkednt is translating this from Corporate",
  "linkednt is finding the sentence that matters",
  "linkednt is asking the post to calm down",
  "linkednt is separating the story from the performance",
];

export function createLoadingCard(ctx: CardContext): HTMLElement {
  const card = makeCard("loading", ctx);
  const inner = card.querySelector<HTMLElement>(".lo-card-inner")!;
  const line =
    LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
  inner.innerHTML = `
    <div class="lo-scan" aria-hidden="true"></div>
    <p class="lo-kicker">${line}</p>
    <div class="lo-skeleton"></div>
    <div class="lo-skeleton short"></div>
  `;
  appendFooter(card, ctx);
  return card;
}

export function createResultCard(text: string, ctx: CardContext): HTMLElement {
  const card = makeCard("ready", ctx);
  const inner = card.querySelector<HTMLElement>(".lo-card-inner")!;

  const kicker = document.createElement("p");
  kicker.className = "lo-kicker";
  kicker.textContent = "linkedn't translation";

  const body = document.createElement("p");
  body.className = "lo-result";
  body.textContent = text || "Couldn't deslop this one.";
  appendInlineWatermark(body);

  inner.append(kicker, body);
  appendFooter(card, ctx);
  return card;
}

export function createErrorCard(
  text: string,
  ctx: CardContext,
  code?: string,
  onRetry?: () => void,
): HTMLElement {
  const card = makeCard("error", ctx);
  const inner = card.querySelector<HTMLElement>(".lo-card-inner")!;

  // The error code lands on the card as a data attribute so the content
  // script can find and dismiss stale auth errors (e.g. when the user signs
  // in after seeing this card) without nuking every other card on the page.
  if (code) card.setAttribute("data-lo-error-code", code);

  const kicker = document.createElement("p");
  kicker.className = "lo-kicker";
  kicker.textContent = "Something resisted translation";

  const body = document.createElement("p");
  body.className = "lo-result";
  body.textContent = text || "Couldn't deslop this one.";
  appendInlineWatermark(body);

  inner.append(kicker, body);
  appendFooter(card, ctx, onRetry);
  return card;
}

/**
 * Appends a small inline watermark span as the last child of the body paragraph.
 * Because it's inline-flowed with the text, it lands on the same line as the
 * last word of the rewrite — surviving even if the footer is clipped or
 * hidden by overlapping LinkedIn UI.
 */
function appendInlineWatermark(body: HTMLElement): void {
  const trailingSpace = document.createTextNode(" ");
  const mark = document.createElement("span");
  mark.className = "lo-inline-watermark";
  mark.textContent = "— linkednt.com";
  body.append(trailingSpace, mark);
}

function makeCard(
  kind: "loading" | "ready" | "error",
  _ctx: CardContext,
): HTMLElement {
  const card = document.createElement("div");
  card.className = `${CARD_CLASS} lo-card-${kind}`;
  const inner = document.createElement("div");
  inner.className = "lo-card-inner";
  card.appendChild(inner);
  return card;
}

function appendFooter(
  card: HTMLElement,
  ctx: CardContext,
  onRetry?: () => void,
): void {
  const footer = document.createElement("div");
  footer.className = "lo-footer";

  const actions = document.createElement("div");
  actions.className = "lo-footer-actions";

  if (onRetry) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "lo-retry-btn";
    retryBtn.textContent = "↺ Retry";
    retryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onRetry();
    });
    actions.appendChild(retryBtn);
  }

  const showOriginal = document.createElement("button");
  showOriginal.type = "button";
  showOriginal.className = "lo-show-original";
  showOriginal.textContent = "Show original";
  showOriginal.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    showContainer(ctx.hiddenContainer);
    card.style.display = "none";
  });
  actions.appendChild(showOriginal);

  const watermark = document.createElement("span");
  watermark.className = "lo-watermark";
  watermark.textContent = "linkednt.com";

  footer.append(actions, watermark);
  card.appendChild(footer);
}

/**
 * Brings a previously-hidden card back into view and re-hides its container.
 * Used when the user clicks Deslop again after having clicked Show original.
 */
export function reshowCard(container: HTMLElement, card: HTMLElement): void {
  card.style.removeProperty("display");
  hideContainer(container);
}

/**
 * Cleans up all cards and restores their hidden containers. Called on disable.
 */
export function teardownAllCards(): void {
  document
    .querySelectorAll<HTMLElement>(`.${CARD_CLASS}`)
    .forEach((card) => card.remove());
  document
    .querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}="true"]`)
    .forEach((el) => {
      showContainer(el);
    });
}

export function showToast(host: HTMLElement, message: string): void {
  const toast = document.createElement("div");
  toast.className = TOAST_CLASS;
  toast.textContent = message;
  host.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2400);
}
