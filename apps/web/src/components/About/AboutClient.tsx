"use client";

import React from "react";
import { AboutHero } from "./AboutHero";
import { AboutStory } from "./AboutStory";
import { AboutValues } from "./AboutValues";
import { AboutQuote } from "./AboutQuote";
import { AboutTeam } from "./AboutTeam";
import { AboutCTA } from "./AboutCTA";

const AboutClient: React.FC = () => {
  return (
    <div className="bg-brand-beige min-h-screen">
      {/* ===== COLD OPEN — text only, no hero image ===== */}
      <AboutHero />

      {/* ===== THREE CHAPTERS ===== */}
      <AboutStory />

      {/* ===== TEAM / FOUNDERS — warm beige ===== */}
      <AboutTeam />

      {/* ===== MANIFESTO — scroll-reveal principles ===== */}
      <AboutValues />

      {/* ===== QUOTE ===== */}
      <AboutQuote />

      {/* ===== LOCATION / CTA ===== */}
      <AboutCTA />
    </div>
  );
};

export default AboutClient;
