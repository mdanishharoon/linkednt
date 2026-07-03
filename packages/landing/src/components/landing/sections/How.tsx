"use client";

// How.tsx — the product demo. A faithful mini render of the extension popup
// (voice picker) drives a feed of posts wearing the real translation card.
import { useRef, useState } from "react";
import { Logo, MiniBadge } from "../Logo";
import { Avatar, Ico } from "../icons";
import { ClickSpark, type SparkHandle } from "../ClickSpark";
import { MorphHeight } from "../MorphHeight";
import { TranslationCard } from "../TranslationCard";
import { DEMO_POST, VOICES, type DemoPost, type VoiceId } from "@/lib/content";

function DemoFeedPost({
  post,
  voice,
  open,
  onToggle,
}: {
  post: DemoPost;
  voice: VoiceId;
  open: boolean;
  onToggle: () => void;
}) {
  const sparks = useRef<SparkHandle>(null);

  return (
    <div className="post">
      <ClickSpark ref={sparks} />
      <div className="post-head">
        <Avatar
          variant={post.variant}
          src={post.avatar}
          invert={post.avatarInvert}
        />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">
            {post.name} <span className="deg">· 1st</span>
          </div>
          <div className="post-title">{post.title}</div>
          <div className="post-meta">
            {post.time} · <Ico.globe />
          </div>
        </div>
        <span className="post-follow">+ Follow</span>
      </div>
      <MorphHeight className="post-body demo-swap">
        {open ? (
          // key includes the voice so switching voices replays the fade.
          <div className="inner" key={voice}>
            <TranslationCard onShowOriginal={onToggle}>
              {post.honest[voice]}
            </TranslationCard>
          </div>
        ) : (
          <div className="inner" key="s">
            <div className="slop-text">{post.slop}</div>
          </div>
        )}
      </MorphHeight>
      <div className="post-actions">
        <span className="pa">
          <Ico.thumb /> Like
        </span>
        <span className="pa">
          <Ico.comment /> Comment
        </span>
        <button
          className={"pa pa-deslop" + (open ? " on" : "")}
          type="button"
          onClick={(e) => {
            sparks.current?.burst(e);
            onToggle();
          }}
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

export function How() {
  const [voice, setVoice] = useState<VoiceId>("roast");
  const [open, setOpen] = useState(true);

  return (
    <section className="section" id="how">
      <div className="container">
        <div className="reveal" style={{ maxWidth: 660 }}>
          <span className="eyebrow muted">How it works</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Pick a voice. Hit Deslop.
          </h2>
          <p className="lede" style={{ marginTop: 16 }}>
            Install it and every post in your feed grows a{" "}
            <b style={{ color: "var(--ink)" }}>Deslop</b>{" "}button. The popup
            picks how mean you want the translation &mdash; plain English on
            the safe end, full group-chat commentary on the other. Try all
            three on the post below.
          </p>
        </div>

        <div className="bw reveal">
          <div className="bw-bar">
            <div className="bw-lights">
              <i style={{ background: "#ED6A5E" }} />
              <i style={{ background: "#F4BE4F" }} />
              <i style={{ background: "#61C554" }} />
            </div>
            <div className="bw-url">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              linkedin.com/feed
            </div>
            <div className="bw-tools">
              <span className="bw-tool" />
              <span className="bw-tool" />
              <span className="bw-pin" title="linkedn't">
                <MiniBadge />
              </span>
            </div>
          </div>
          <div className="bw-body">
            <div className="bw-pop">
              <div className="bw-pop-top">
                <Logo size={17} />
                <span className="pop-credits">37 credits</span>
              </div>
              <div className="pop-voices">
                <div className="pop-vhead">Translation voice</div>
                <div className="pop-vsub">Choose how blunt you want it.</div>
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={"voice-row" + (voice === v.id ? " on" : "")}
                    onClick={() => setVoice(v.id)}
                  >
                    <span
                      className={"voice-viz viz-" + v.id}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="voice-copy">
                      <strong>{v.label}</strong>
                      <small>{v.blurb}</small>
                    </span>
                    <svg
                      className="voice-check"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8.5l3.2 3.2L13 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div className="bw-feed">
              <DemoFeedPost
                post={DEMO_POST}
                voice={voice}
                open={open}
                onToggle={() => setOpen((o) => !o)}
              />
            </div>
          </div>
        </div>

        <div className="bw-caption">
          <b>Pin it once</b>
          <span className="sep">·</span>
          <b>Pick a voice</b>
          <span className="sep">·</span>
          <b>Deslop anything</b>
        </div>
      </div>
    </section>
  );
}
