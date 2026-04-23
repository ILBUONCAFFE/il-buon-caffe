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
      // Bing crawlers — explicit rules for best Bing Search indexing coverage
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
      // BingPreview — renders Open Graph previews shown in Bing search results
      {
        userAgent: "BingPreview",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      // adidxbot — Bing Ads quality/relevance crawler
      {
        userAgent: "adidxbot",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      // All other well-behaved crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      // Block AI training scrapers — no disallow exceptions
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
