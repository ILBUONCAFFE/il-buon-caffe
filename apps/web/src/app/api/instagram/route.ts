import { NextResponse } from "next/server";

export const revalidate = 3600; // cache 1 hour

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const LIMIT = 6;

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    return NextResponse.json(
      { error: "Instagram not configured" },
      { status: 503 }
    );
  }

  try {
    const url = `https://graph.instagram.com/v21.0/${userId}/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      const err = await res.json();
      console.error("[instagram] Graph API error:", err);
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const data = await res.json();
    const posts: InstagramPost[] = (data.data ?? []).filter(
      (p: InstagramPost) => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM"
    );

    return NextResponse.json(posts, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("[instagram] fetch failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
