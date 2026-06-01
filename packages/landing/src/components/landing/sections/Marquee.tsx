import { BUZZ } from "@/lib/content";

export function Marquee() {
  const row = [...BUZZ, ...BUZZ];
  return (
    <div className="marqueeband marquee-row">
      <div className="marquee">
        {row.map((w, i) => (
          <span className="mq-item" key={i}>
            <span className="word">{w}</span>
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
