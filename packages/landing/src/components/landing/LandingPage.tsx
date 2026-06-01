"use client";

// LandingPage.tsx — assembles the page and owns global Honesty mode (mirrors app.jsx).
import { HonestyProvider } from "./honesty";
import { useReveal } from "./use-reveal";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Marquee } from "./sections/Marquee";
import { How } from "./sections/How";
import { Gallery } from "./sections/Gallery";
import { Phrasebook } from "./sections/Phrasebook";
import { FAQ } from "./sections/FAQ";
import { CTA } from "./sections/CTA";
import { Footer } from "./sections/Footer";

export function LandingPage() {
  useReveal();
  return (
    <HonestyProvider>
      <Nav />
      <Hero />
      <Marquee />
      <How />
      <Gallery />
      <Phrasebook />
      <FAQ />
      <CTA />
      <Footer />
    </HonestyProvider>
  );
}
