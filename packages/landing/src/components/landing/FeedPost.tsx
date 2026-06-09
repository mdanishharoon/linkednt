"use client";

// FeedPost.tsx — a LinkedIn post card with the extension's real affordance:
// a Deslop action in the action bar that renders the translation card in
// place, and a Show original pill inside the card to flip back.
import { useState, type ReactNode } from "react";
import { Avatar, Ico } from "./icons";
import { TranslationCard } from "./TranslationCard";

export function FeedPost({
  name,
  degree = "1st",
  title,
  time = "2h",
  slop,
  honest,
  variant = "",
  avatar,
  avatarInvert = false,
  follow = true,
}: {
  name: string;
  degree?: string;
  title: string;
  time?: string;
  slop: ReactNode;
  honest: ReactNode;
  variant?: string;
  avatar?: string;
  avatarInvert?: boolean;
  follow?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="post">
      <div className="post-head">
        <Avatar variant={variant} src={avatar} invert={avatarInvert} />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">
            {name} <span className="deg">· {degree}</span>
          </div>
          <div className="post-title">{title}</div>
          <div className="post-meta">
            {time} · <Ico.globe />
          </div>
        </div>
        {follow && <span className="post-follow">+ Follow</span>}
      </div>

      <div className="post-body">
        <div
          className="collapse"
          style={{ gridTemplateRows: open ? "0fr" : "1fr" }}
        >
          <div>
            <div
              className="inner"
              style={{
                opacity: open ? 0 : 1,
                transform: open ? "translateY(-5px)" : "none",
              }}
            >
              <div className="slop-text">{slop}</div>
            </div>
          </div>
        </div>
        <div
          className="collapse"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div>
            <div
              className="inner"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(5px)",
              }}
            >
              <TranslationCard onShowOriginal={() => setOpen(false)}>
                {honest}
              </TranslationCard>
            </div>
          </div>
        </div>
      </div>

      <div className="post-actions">
        <span className="pa">
          <Ico.thumb /> Like
        </span>
        <span className="pa">
          <Ico.comment /> Comment
        </span>
        <span className="pa">
          <Ico.repost /> Repost
        </span>
        <button
          className={"pa pa-deslop" + (open ? " on" : "")}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="deslop-chip" aria-hidden="true">
            +
          </span>
          Deslop
        </button>
      </div>
    </div>
  );
}
