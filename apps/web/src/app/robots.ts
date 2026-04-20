import type { MetadataRoute } from "next";

const BASE_URL = "https://ilbuoncaffe.pl";
const PRIVATE_DISALLOW = ["/admin", "/account", "/auth", "/checkout", "/order", "/api/"];

const AI_TRAINING_BOTS = [
  "GPTBot",
  "Google-Extended",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Anthropic-ai",
  "Applebot-Extended",
  "Bytespider",
  "Omgilibot",
  "Omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "bingbot",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
        crawlDelay: 1,
      },
      {
        userAgent: "msnbot",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
        crawlDelay: 1,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
