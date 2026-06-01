"use client";

import { useState } from "react";
import { Logo, MiniBadge } from "../Logo";
import { Avatar, Ico } from "../icons";
import { DEMO, type Post } from "@/lib/content";

function DemoPost({
  name,
  title,
  time,
  variant,
  slop,
  honest,
  open,
}: Post & { open: boolean }) {
  return (
    <div className="post">
      <div className="post-head">
        <Avatar variant={variant} />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">
            {name} <span className="deg">· 1st</span>
          </div>
          <div className="post-title">{title}</div>
          <div className="post-meta">
            {time} · <Ico.globe />
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
            <div className="honest-text">{honest}</div>
          </div>
        ) : (
          <div className="inner" key="s">
            <div className="slop-text">{slop}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function How() {
  const [on, setOn] = useState(true);
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="reveal" style={{ maxWidth: 660 }}>
          <span className="eyebrow muted">How it works</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            There&rsquo;s no step two.
          </h2>
          <p className="lede" style={{ marginTop: 16 }}>
            Pin linkedn&rsquo;t, flip{" "}
            <b style={{ color: "var(--ink)" }}>Honesty mode</b>, and the whole
            feed starts saying what it means. That&rsquo;s the product &mdash;
            go ahead, hit the switch.
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
              <span
                className="bw-pin"
                onClick={() => setOn((o) => !o)}
                title="linkedn't"
              >
                <span className="ring" />
                <MiniBadge />
              </span>
            </div>
          </div>
          <div className="bw-body">
            <div className="bw-pop">
              <div className="bw-pop-top">
                <Logo size={17} />
                <span className="st">
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: "var(--green)",
                    }}
                  />{" "}
                  Active
                </span>
              </div>
              <div className="bw-pop-tog" onClick={() => setOn((o) => !o)}>
                <div>
                  <div className="tg-lbl">Honesty mode</div>
                  <div className="tg-sub">
                    {on ? "Translating this page" : "Showing the originals"}
                  </div>
                </div>
                <span
                  className={"track" + (on ? " on" : "")}
                  style={{ marginLeft: "auto" }}
                >
                  <span className="knob" />
                </span>
              </div>
              <div className="bw-pop-stat">
                <Ico.check />{" "}
                <span>
                  <b>1,204</b> posts made honest today
                </span>
              </div>
            </div>
            <div className="bw-feed">
              {DEMO.map((p, i) => (
                <DemoPost key={i} {...p} open={on} />
              ))}
            </div>
          </div>
        </div>

        <div className="bw-caption">
          <b>Pin it once</b>
          <span className="sep">·</span>
          <b>Flip the switch</b>
          <span className="sep">·</span>
          <b>Read the truth</b>
        </div>
      </div>
    </section>
  );
}
