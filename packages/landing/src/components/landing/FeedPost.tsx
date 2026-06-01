"use client";

// FeedPost.tsx — the interactive feed card. Click to toggle slop ⇄ honest;
// also follows the global Honesty mode.
import { useContext, useState, type ReactNode } from "react";
import { HonestyContext } from "./honesty";
import { Avatar, Ico } from "./icons";

export function FeedPost({
  name,
  degree = "1st",
  title,
  time = "2h",
  slop,
  honest,
  variant = "",
  interactive = true,
  follow = true,
}: {
  name: string;
  degree?: string;
  title: string;
  time?: string;
  slop: ReactNode;
  honest: ReactNode;
  variant?: string;
  interactive?: boolean;
  follow?: boolean;
}) {
  const { honest: globalHonest } = useContext(HonestyContext);
  const [open, setOpen] = useState(globalHonest);
  // Sync to the global Honesty switch when it flips, while still allowing a
  // local per-post toggle in between (React's "adjust state during render").
  const [lastGlobal, setLastGlobal] = useState(globalHonest);
  if (globalHonest !== lastGlobal) {
    setLastGlobal(globalHonest);
    setOpen(globalHonest);
  }

  return (
    <div
      className={"post" + (interactive ? " interactive" : "")}
      onClick={interactive ? () => setOpen((o) => !o) : undefined}
    >
      <div className="post-head">
        <Avatar variant={variant} />
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
              className="inner honest-wrap"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(5px)",
              }}
            >
              <div className="tchip">
                translated by linkedn&rsquo;t <span className="ln" />
              </div>
              <div className="honest-text">{honest}</div>
            </div>
          </div>
        </div>
      </div>

      {interactive && (
        <div className="post-hint">
          {open ? (
            <>
              <Ico.check /> Honest — click to undo
            </>
          ) : (
            <>
              <Ico.down /> Click to see what they meant
            </>
          )}
        </div>
      )}

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
      </div>
    </div>
  );
}
