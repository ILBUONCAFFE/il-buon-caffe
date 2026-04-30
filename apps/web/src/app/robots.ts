import type { MetadataRoute } from "next";

const BASE_URL = "https://ilbuoncaffe.pl";
const PRIVATE_DISALLOW = ["/admin", "/account", "/auth", "/checkout", "/order", "/api/"];

const AI_DISCOVERY_BOTS = [
  "OAI-SearchBot",
  "GPTBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "ClaudeBot",
  "Anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Gemini-Deep-Research",
  "CCBot",
  "Amazonbot",
  "Applebot",
  "Applebot-Extended",
  "Bytespider",
  "FacebookBot",
  "meta-externalagent",
  "YouBot",
  "cohere-ai",
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
      // AI search, answer engines, and training crawlers may read public storefront content.
      // Private customer, checkout, admin, and API routes remain excluded.
      {
        userAgent: AI_DISCOVERY_BOTS,
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      // All other well-behaved crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
