"use client";

import React from "react";
import { AboutHero } from "./AboutHero";
import { AboutQuote } from "./AboutQuote";
import { AboutStory } from "./AboutStory";
import { AboutTeam } from "./AboutTeam";
import { AboutValues } from "./AboutValues";
import { AboutCTA } from "./AboutCTA";

const AboutClient: React.FC = () => {
  return (
    <div className="bg-brand-beige min-h-screen">
      {/* 1. Hero — dark, full-screen, parallax, bottom-left copy */}
      <AboutHero />

      {/* 2. Editorial standfirst — beige, big single paragraph */}
      <AboutQuote />

      {/* 3. Historia — dark, three-column newspaper layout */}
      <AboutStory />

      {/* 4. Firma rodzinna — beige, honest prose, no role labels */}
      <AboutTeam />

      {/* 5. Zasady domu — beige, typographic manifesto notice */}
      <AboutValues />

      {/* 6. Znajdź nas — dark, map, address, hours */}
      <AboutCTA />
    </div>
  );
};

export default AboutClient;
