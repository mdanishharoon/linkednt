"use client";

import { useEffect, useState } from "react";
import { Logo } from "../Logo";
import { Ico } from "../icons";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <nav className={"nav" + (scrolled ? " scrolled" : "")}>
      <div className="container nav-inner">
        <a href="#top">
          <Logo size={23} />
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#phrasebook">Phrasebook</a>
          <a href="/pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-right">
          <a className="btn btn-blue btn-sm" href="#install">
            <Ico.puzzle width="16" height="16" /> Add to Chrome
          </a>
        </div>
      </div>
    </nav>
  );
}
