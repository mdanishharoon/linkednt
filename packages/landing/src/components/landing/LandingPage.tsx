"use client";

// LandingPage.tsx — assembles the page. One hero demo, one product demo;
// everything else is copy.
import { useEffect } from "react";
import { useReveal } from "./use-reveal";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Marquee } from "./sections/Marquee";
import { How } from "./sections/How";
import { Phrasebook } from "./sections/Phrasebook";
import { FAQ } from "./sections/FAQ";
import { CTA } from "./sections/CTA";
import { Footer } from "./sections/Footer";

export function LandingPage() {
  useReveal();

  // Easter egg: leave the tab and it updates its status accordingly.
  useEffect(() => {
    const original = document.title;
    const onVisibility = () => {
      document.title = document.hidden
        ? "open to work — linkedn’t"
        : original;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.title = original;
    };
  }, []);

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <How />
      <Phrasebook />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
