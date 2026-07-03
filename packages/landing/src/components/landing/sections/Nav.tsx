"use client";

import { useEffect, useState } from "react";
import { Logo } from "../Logo";
import { Ico } from "../icons";
import { CWS_URL } from "@/lib/content";

export function Nav() {
  // past the hero's first beats the bar collapses into a floating pill,
  // keeping the Add to Chrome CTA on screen the whole way down
  const [pill, setPill] = useState(false);
  useEffect(() => {
    const on = () => setPill(window.scrollY > 64);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <nav className={"nav" + (pill ? " pill" : "")}>
      <div className="container nav-inner">
        <a href="#top">
          <Logo size={23} />
        </a>
        <div className="nav-links">
          <a href="#how">how?</a>
          <a href="#phrasebook">what?</a>
          <a href="/pricing">how much?</a>
          <a href="#faq">faq</a>
        </div>
        <div className="nav-right">
          <a
            className="btn btn-blue btn-sm"
            href={CWS_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Ico.puzzle width="16" height="16" /> Add to Chrome
          </a>
        </div>
      </div>
    </nav>
  );
}
