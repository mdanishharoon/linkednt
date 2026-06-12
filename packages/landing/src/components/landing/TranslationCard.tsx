"use client";

// TranslationCard.tsx — the extension's in-page rewrite card, reproduced
// faithfully from contents/linkedin.css (.lo-card): blue kicker, the honest
// result, then a hairline footer with the Show original pill and watermark.
import type { ReactNode } from "react";

export function TranslationCard({
  children,
  onShowOriginal,
}: {
  children: ReactNode;
  onShowOriginal?: () => void;
}) {
  return (
    <div className="tr-card">
      <p className="tr-kicker">linkedn&rsquo;t translation</p>
      <p className="tr-body">{children}</p>
      <div className="tr-foot">
        {onShowOriginal ? (
          <button className="tr-show" type="button" onClick={onShowOriginal}>
            Show original
          </button>
        ) : (
          <span />
        )}
        <span className="tr-mark">linkednt.com</span>
      </div>
    </div>
  );
}
