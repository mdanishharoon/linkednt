"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Avatar, Ico } from "../icons";
import { POSTS, type Post } from "@/lib/content";

function DeckCard({ card, open }: { card: Post; open: boolean }) {
  return (
    <div className="post">
      <div className="post-head">
        <Avatar variant={card.variant} />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">
            {card.name} <span className="deg">· 1st</span>
          </div>
          <div className="post-title">{card.title}</div>
          <div className="post-meta">
            {card.time} · <Ico.globe />
          </div>
        </div>
        <span className="post-follow">+ Follow</span>
      </div>
      <div className="post-body demo-swap">
        {open ? (
          <div className="inner honest-wrap" key="h">
            <div className="tchip">
              translated by linkedn&rsquo;t <span className="ln" />
            </div>
            <div className="honest-text">{card.honest}</div>
          </div>
        ) : (
          <div className="inner" key="s">
            <div className="slop-text">{card.slop}</div>
          </div>
        )}
      </div>
      <div className="post-hint">
        {open ? (
          <>
            <Ico.check /> Honest — tap to undo
          </>
        ) : (
          <>
            <Ico.down /> Tap to see what they meant
          </>
        )}
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
      </div>
    </div>
  );
}

export function Gallery() {
  const n = POSTS.length;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const d = useRef({ active: false, startX: 0, moved: 0 });

  const go = (dir: number) => setIndex((i) => (((i + dir) % n) + n) % n);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    d.current = { active: true, startX: e.clientX, moved: 0 };
    setDragging(true);
    if (e.currentTarget.setPointerCapture)
      e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!d.current.active) return;
    const dx = e.clientX - d.current.startX;
    d.current.moved = Math.max(d.current.moved, Math.abs(dx));
    setDrag(dx);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!d.current.active) return;
    const dx = e.clientX - d.current.startX;
    d.current.active = false;
    setDragging(false);
    setDrag(0);
    if (d.current.moved < 8) setOpen((o) => ({ ...o, [index]: !o[index] }));
    else if (dx < -64) go(1);
    else if (dx > 64) go(-1);
  };

  const slot = (rel: number) => {
    // rel: 0 front, 1/2 peeking behind, n-1 parked off-left (just-passed)
    if (rel === 0) {
      const rot = drag * 0.025;
      return {
        transform: `translateX(${drag}px) translateY(0) rotate(${rot}deg) scale(1)`,
        opacity: 1,
        zIndex: 50,
        transition: dragging ? "none" : undefined,
      };
    }
    if (rel === 1)
      return {
        transform: "translateY(18px) scale(.95)",
        opacity: 1,
        zIndex: 40,
      };
    if (rel === 2)
      return {
        transform: "translateY(36px) scale(.90)",
        opacity: 1,
        zIndex: 30,
      };
    if (rel === n - 1)
      return {
        transform:
          "translateX(-130%) translateY(10px) rotate(-9deg) scale(.92)",
        opacity: 0,
        zIndex: 20,
      };
    return { transform: "translateY(48px) scale(.86)", opacity: 0, zIndex: 10 };
  };

  return (
    <section className="section bg-feed" id="examples">
      <div className="container">
        <div
          className="reveal center"
          style={{ maxWidth: 600, margin: "0 auto" }}
        >
          <span className="eyebrow muted">Before / after</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Every post has a director&rsquo;s cut.
          </h2>
          <p className="lede" style={{ marginTop: 16 }}>
            Swipe through the feed. Tap any post to see what it really meant.
          </p>
        </div>

        <div className="deck-wrap reveal">
          <div className="deck">
            {POSTS.map((card, i) => {
              const rel = (((i - index) % n) + n) % n;
              const isFront = rel === 0;
              return (
                <div
                  key={i}
                  className={"deck-card" + (isFront ? " front" : "")}
                  style={slot(rel)}
                  onPointerDown={isFront ? onDown : undefined}
                  onPointerMove={isFront ? onMove : undefined}
                  onPointerUp={isFront ? onUp : undefined}
                  onPointerCancel={isFront ? onUp : undefined}
                >
                  <DeckCard card={card} open={!!open[i]} />
                </div>
              );
            })}
          </div>

          <div className="deck-ctrl">
            <button
              className="deck-arrow"
              onClick={() => go(-1)}
              aria-label="Previous"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <span className="deck-count">
              {index + 1} / {n}
            </span>
            <button
              className="deck-arrow"
              onClick={() => go(1)}
              aria-label="Next"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="deck-dots" style={{ marginTop: 18 }}>
            {POSTS.map((_, i) => (
              <button
                key={i}
                className={"deck-dot" + (i === index ? " on" : "")}
                onClick={() => setIndex(i)}
                aria-label={"Post " + (i + 1)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
