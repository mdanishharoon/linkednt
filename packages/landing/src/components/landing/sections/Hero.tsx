import { FeedPost } from "../FeedPost";
import { Ico } from "../icons";
import { HERO_POST } from "@/lib/content";

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="container hero-grid">
        <div className="reveal in">
          <h1 className="h1">
            See what they
            <br />
            actually meant.
          </h1>
          <p className="lede" style={{ marginTop: 20, maxWidth: 480 }}>
            linkedn&rsquo;t quietly rewrites LinkedIn posts into plain, honest
            English. The humblebrags, the &ldquo;thrilled to announce,&rdquo;
            the 4am gratitude threads &mdash; translated, one click at a time.
          </p>
          <div className="hero-cta">
            <a className="btn btn-blue btn-lg" href="#install">
              <Ico.puzzle /> Add to Chrome &mdash; it&rsquo;s free
            </a>
            <a className="btn btn-ghost btn-lg" href="#examples">
              See examples
            </a>
          </div>
        </div>

        <div className="hero-stack reveal in">
          <div
            className="bg-card"
            style={{
              transform: "rotate(3deg) translate(14px,10px)",
              opacity: 0.5,
            }}
          />
          <div
            className="bg-card"
            style={{
              transform: "rotate(-2.5deg) translate(-10px,6px)",
              opacity: 0.8,
            }}
          />
          <div style={{ position: "relative" }}>
            <FeedPost {...HERO_POST} />
          </div>
        </div>
      </div>
    </header>
  );
}
