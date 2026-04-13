import type { MetadataRoute } from "next";

const BASE_URL = "https://ilbuoncaffe.pl";

export default function robots(): MetadataRoute.Robots {
  const commonDisallow = ["/admin", "/account", "/auth", "/checkout", "/order", "/api/"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: commonDisallow,
      },
      {
        userAgent: [
          "GPTBot",
          "Google-Extended",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Anthropic-ai",
          "Applebot-Extended",
          "Bytespider",
          "Diffbot",
          "FacebookBot",
          "ImagesiftBot",
          "OAI-SearchBot",
          "Omgilibot",
          "Omgili",
        ],
        allow: "/",
        disallow: commonDisallow,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
