"use client";

// Hero.tsx — headline plus a self-cycling deck of posts. Advances every 6s;
// drag to swipe forward/back. Buttons inside cards (Deslop, Show original)
// stay clickable because drags starting on a button are ignored.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { FeedPost } from "../FeedPost";
import { Ico } from "../icons";
import { Magnet } from "../Magnet";
import { CWS_URL, HERO_POST, POKEMON_POST, POSTS } from "@/lib/content";

const CARDS = [POKEMON_POST, HERO_POST, ...POSTS];

function HeroDeck() {
  const n = CARDS.length;
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const d = useRef({ active: false, startX: 0, moved: 0 });

  const go = (dir: number) => setIndex((i) => (((i + dir) % n) + n) % n);

  // Auto-advance every 6s. Any index change (manual swipe included) resets
  // the timer; dragging pauses it; reduced-motion users opt out entirely.
  useEffect(() => {
    if (dragging) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % n),
      6000,
    );
    return () => window.clearInterval(t);
  }, [index, dragging, n]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
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
    if (dx < -64) go(1);
    else if (dx > 64) go(-1);
  };

  const slot = (rel: number) => {
    if (rel === 0) {
      const rot = drag * 0.025;
      return {
        transform: `translateX(${drag}px) rotate(${rot}deg)`,
        opacity: 1,
        zIndex: 50,
        transition: dragging ? "none" : undefined,
      };
    }
    if (rel === 1)
      return {
        transform: "rotate(-2.5deg) translate(-10px, 6px) scale(.97)",
        opacity: 0.9,
        zIndex: 40,
      };
    if (rel === 2)
      return {
        transform: "rotate(3deg) translate(14px, 10px) scale(.94)",
        opacity: 0.55,
        zIndex: 30,
      };
    if (rel === n - 1)
      return {
        transform: "translateX(-120%) rotate(-8deg) scale(.95)",
        opacity: 0,
        zIndex: 20,
      };
    return { transform: "scale(.9)", opacity: 0, zIndex: 10 };
  };

  return (
    <div>
      <div className="hero-deck">
        {CARDS.map((card, i) => {
          const rel = (((i - index) % n) + n) % n;
          const isFront = rel === 0;
          return (
            <div
              key={i}
              className={"hero-card" + (isFront ? " front" : "")}
              style={slot(rel)}
              onPointerDown={isFront ? onDown : undefined}
              onPointerMove={isFront ? onMove : undefined}
              onPointerUp={isFront ? onUp : undefined}
              onPointerCancel={isFront ? onUp : undefined}
            >
              <FeedPost {...card} />
            </div>
          );
        })}
      </div>
      <div className="hero-dots">
        {CARDS.map((_, i) => (
          <button
            key={i}
            className={"hero-dot" + (i === index ? " on" : "")}
            onClick={() => setIndex(i)}
            aria-label={"Post " + (i + 1)}
          />
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="container hero-grid">
        <div className="reveal in">
          <h1 className="h1">
            &ldquo;Excited to announce&rdquo;
            <br />
            No you&rsquo;re not.
          </h1>
          <p className="lede" style={{ marginTop: 20, maxWidth: 480 }}>
            You really aren&rsquo;t. You&rsquo;ve been drafting that
            announcement for weeks, workshopping which word sounds the most
            humbled. It&rsquo;s fine. Everyone&rsquo;s doing it.
            linkedn&rsquo;t is a Chrome extension that detects LinkedIn LARP
            and translates it.
          </p>
          <div className="hero-cta">
            <Magnet>
              <a
                className="btn btn-blue btn-lg"
                href={CWS_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Ico.puzzle /> Add to Chrome &mdash; it&rsquo;s free
              </a>
            </Magnet>
            <a className="btn btn-ghost btn-lg" href="#how">
              See how it works
            </a>
          </div>
        </div>

        <div className="hero-stack reveal in">
          <HeroDeck />
        </div>
      </div>
    </header>
  );
}
