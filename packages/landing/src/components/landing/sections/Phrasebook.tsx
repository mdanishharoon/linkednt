"use client";

import { useState } from "react";

const VIDEO_ID = "RF4EWo0Sm1o";

export function Phrasebook() {
  // Lazy "facade": show a poster + our own play button, and only mount the
  // real YouTube iframe once the user clicks (which also autoplays it). Keeps
  // YouTube's player JS off the page until it's wanted.
  const [playing, setPlaying] = useState(false);
  return (
    <section className="section" id="phrasebook">
      <div className="container">
        <div className="pb-video reveal">
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
              title="linkedn’t launch video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="pb-facade"
              onClick={() => setPlaying(true)}
              aria-label="Play the linkedn’t launch video"
              style={{
                backgroundImage: `url(https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg)`,
              }}
            >
              <span className="pb-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
