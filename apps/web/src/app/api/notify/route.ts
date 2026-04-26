import { NextRequest, NextResponse } from "next/server";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";
const NOTIFY_LIST_ID = 8; // Lista "Powiadomienie o nowościach w sklepie"

export async function POST(req: NextRequest) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Notify] Brak BREVO_API_KEY.");
    return NextResponse.json({ error: "Błąd konfiguracji serwera." }, { status: 500 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const { email, name } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
  }

  const attributes: Record<string, string> = {};
  if (name?.trim()) attributes.FIRSTNAME = name.trim();

  const payload: Record<string, unknown> = {
    email,
    listIds: [NOTIFY_LIST_ID],
    updateEnabled: true,
    tags: ["notify-shop", "ilbuoncaffe.pl"],
    ...(Object.keys(attributes).length > 0 && { attributes }),
  };

  console.log("[Notify] →", JSON.stringify(payload));

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("[Notify] ←", response.status, responseText);

    if ([200, 201, 204].includes(response.status)) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    let errorMessage = "Nie udało się zapisać. Spróbuj ponownie.";
    try {
      const data = JSON.parse(responseText);
      errorMessage = data?.message ?? errorMessage;
    } catch { /* ignore */ }

    return NextResponse.json(
      { error: errorMessage },
      { status: response.status >= 500 ? 502 : 400 }
    );
  } catch (err) {
    console.error("[Notify] Fetch error:", err);
    return NextResponse.json(
      { error: "Błąd połączenia z serwerem. Spróbuj ponownie później." },
      { status: 502 }
    );
  }
}
