const LOG = "[linkednt:dx]";

const PROBE_CANDIDATES = [
  ".feed-shared-update-v2",
  '[data-urn*="activity"]',
  "div[data-id^='urn:li:activity']",
  '[role="listitem"][componentkey*="FeedType_"]',
  '[role="listitem"]:has([componentkey^="feed-commentary"])',
  '[role="listitem"]:has([data-testid="expandable-text-box"])',
  "[data-urn]",
  '[data-urn^="urn:li:activity:"]',
  '[data-urn^="urn:li:share:"]',
  "[data-id]",
  '[data-id^="urn:li"]',
  "[data-finite-scroll-hotkey-context]",
  'main [role="listitem"]',
  '[role="article"]',
  'div[role="region"]',
  "[componentkey]",
  '[componentkey^="feed"]',
  '[componentkey^="urn:li"]',
  '[componentkey*="commentary"]',
  '[componentkey*="FeedUpdate"]',
  '[componentkey*="FeedType"]',
  '[data-testid="expandable-text-box"]',
  '[data-testid="feed-post"]',
  '[data-test-id*="feed"]',
  ".scaffold-finite-scroll__content > div",
  ".scaffold-finite-scroll__content",
  "article",
  ".feed-shared-actor",
] as const;

export interface ProbeRow {
  selector: string;
  count: number;
  sample: string;
}

export function probeSelectors(): ProbeRow[] {
  const results: ProbeRow[] = [];
  for (const sel of PROBE_CANDIDATES) {
    try {
      const els = document.querySelectorAll<HTMLElement>(sel);
      if (els.length === 0) continue;
      results.push({
        selector: sel,
        count: els.length,
        sample: describeNode(els[0]),
      });
    } catch (e) {
      results.push({
        selector: sel,
        count: -1,
        sample: `error: ${(e as Error).message}`,
      });
    }
  }
  console.info(`${LOG} probe — selectors with >0 matches:`);
  // eslint-disable-next-line no-console
  console.table(results);
  return results;
}

export interface SampleRow {
  tag: string;
  attrs: Record<string, string>;
}

export function sampleFeedCandidates(n = 1): SampleRow[] {
  const main = document.querySelector("main");
  if (!main) {
    console.warn(`${LOG} no <main> element found`);
    return [];
  }
  const candidates = Array.from(main.querySelectorAll<HTMLElement>("*"))
    .filter((el) => {
      return (
        el.hasAttribute("data-urn") ||
        el.hasAttribute("data-id") ||
        el.getAttribute("role") === "listitem" ||
        el.hasAttribute("componentkey")
      );
    })
    .slice(0, n);

  candidates.forEach((el, i) => {
    const truncated =
      el.outerHTML.length > 1500
        ? el.outerHTML.slice(0, 1500) + "...[truncated]"
        : el.outerHTML;
    console.info(`${LOG} sample #${i}`, {
      tag: describeNode(el),
      attrs: collectAttrs(el),
      outerHTML: truncated,
    });
  });
  return candidates.map((el) => ({
    tag: describeNode(el),
    attrs: collectAttrs(el),
  }));
}

export function describeDom() {
  const main = document.querySelector("main");
  return {
    hasMain: !!main,
    mainChildren: main?.children.length ?? 0,
    bodyChildren: document.body.children.length,
    iframes: document.querySelectorAll("iframe").length,
    scaffoldContent: document.querySelectorAll(
      ".scaffold-finite-scroll__content",
    ).length,
    elementsWithDataUrn: document.querySelectorAll("[data-urn]").length,
    elementsWithRoleListitem:
      document.querySelectorAll('[role="listitem"]').length,
    elementsWithComponentkey:
      document.querySelectorAll("[componentkey]").length,
    elementsWithFeedClass: document.querySelectorAll('[class*="feed"]').length,
  };
}

export function describeMainStructure(): {
  hasMain: boolean;
  childrenCount?: number;
  children?: Array<{ tag: string; childrenCount: number; textPreview: string }>;
} {
  const main = document.querySelector("main");
  if (!main) return { hasMain: false };
  return {
    hasMain: true,
    childrenCount: main.children.length,
    children: Array.from(main.children)
      .slice(0, 10)
      .map((el) => ({
        tag: describeNode(el as HTMLElement),
        childrenCount: el.children.length,
        textPreview: ((el as HTMLElement).innerText ?? "")
          .trim()
          .slice(0, 80)
          .replace(/\s+/g, " "),
      })),
  };
}

interface LargeTextRow {
  tag: string;
  parentTag: string;
  chars: number;
  preview: string;
}

function findLargeTextElements(maxN = 3): LargeTextRow[] {
  const out: LargeTextRow[] = [];
  const all = document.querySelectorAll<HTMLElement>("body *");
  for (const el of Array.from(all)) {
    if (out.length >= maxN) break;
    if (el.children.length > 30) continue;
    const text = (el.innerText || "").trim();
    if (text.length < 200 || text.length > 5000) continue;
    // Pick the innermost text container — skip if a child also has >200 chars
    const childHasText = Array.from(el.children).some(
      (child) => ((child as HTMLElement).innerText || "").trim().length > 200,
    );
    if (childHasText) continue;
    out.push({
      tag: describeNode(el),
      parentTag: el.parentElement
        ? describeNode(el.parentElement)
        : "<no parent>",
      chars: text.length,
      preview: text.slice(0, 200).replace(/\s+/g, " "),
    });
  }
  return out;
}

function describeBodyStructure() {
  return Array.from(document.body.children)
    .slice(0, 8)
    .map((el) => ({
      tag: describeNode(el as HTMLElement),
      childrenCount: el.children.length,
    }));
}

export function runFullDiagnostic(): void {
  // Data-only collection: no console.group (which collapses and breaks copy/paste).
  // Single JSON line + clipboard auto-copy so the dev can get the whole thing in one go.
  const probeResults: ProbeRow[] = [];
  for (const sel of PROBE_CANDIDATES) {
    try {
      const els = document.querySelectorAll<HTMLElement>(sel);
      if (els.length === 0) continue;
      probeResults.push({
        selector: sel,
        count: els.length,
        sample: describeNode(els[0]),
      });
    } catch (e) {
      probeResults.push({
        selector: sel,
        count: -1,
        sample: `error: ${(e as Error).message}`,
      });
    }
  }

  const main = document.querySelector("main");
  const samples: Array<{
    tag: string;
    attrs: Record<string, string>;
    outerHTML: string;
  }> = [];
  if (main) {
    const candidates = Array.from(main.querySelectorAll<HTMLElement>("*"))
      .filter(
        (el) =>
          el.hasAttribute("data-urn") ||
          el.hasAttribute("data-id") ||
          el.getAttribute("role") === "listitem" ||
          el.hasAttribute("componentkey"),
      )
      .slice(0, 2);
    for (const el of candidates) {
      samples.push({
        tag: describeNode(el),
        attrs: collectAttrs(el),
        outerHTML:
          el.outerHTML.length > 1500
            ? el.outerHTML.slice(0, 1500) + "...[truncated]"
            : el.outerHTML,
      });
    }
  }

  const dx = {
    url: location.href,
    dom: describeDom(),
    bodyStructure: describeBodyStructure(),
    mainStructure: describeMainStructure(),
    probe: probeResults,
    samples,
    largeTextElements: findLargeTextElements(3),
  };

  const json = JSON.stringify(dx, null, 2);
  console.info("[linkednt:dx] ====== DIAGNOSTIC START ======");
  console.info(
    "[linkednt:dx] Right-click the next line → 'Copy message' → paste back to dev:",
  );
  console.info(json);
  console.info("[linkednt:dx] ====== DIAGNOSTIC END ======");

  try {
    void navigator.clipboard?.writeText(json).then(
      () =>
        console.info(
          "[linkednt:dx] also auto-copied to clipboard — just paste it",
        ),
      () =>
        console.info(
          "[linkednt:dx] clipboard auto-copy denied; copy the JSON line manually",
        ),
    );
  } catch {
    // ignore — clipboard API not available
  }
}

export function describeNode(el: HTMLElement | null): string {
  if (!el) return "<null>";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "";
  return `<${tag}${id}${cls}>`;
}

function collectAttrs(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (
      [
        "data-urn",
        "data-id",
        "data-testid",
        "componentkey",
        "role",
        "class",
      ].includes(attr.name)
    ) {
      out[attr.name] =
        attr.value.length > 120 ? attr.value.slice(0, 120) + "..." : attr.value;
    }
  }
  return out;
}
