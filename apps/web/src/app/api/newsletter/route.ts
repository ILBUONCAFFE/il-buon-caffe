import { NextRequest, NextResponse } from "next/server";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

// Odczytuje listę ID z BREVO_LIST_IDS="11,13" (przecinek jako separator)
// Fallback: BREVO_LIST_ID (pojedyncze ID)
function parseListIds(): number[] {
  const multi = process.env.BREVO_LIST_IDS;
  if (multi) {
    const ids = multi
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    return ids;
  }
  const single = process.env.BREVO_LIST_ID
    ? parseInt(process.env.BREVO_LIST_ID, 10)
    : 0;
  return single > 0 ? [single] : [];
}

const BREVO_LIST_IDS = parseListIds();

export async function POST(req: NextRequest) {
  const apiKey = process.env.BREVO_API_KEY;

  // Loguj konfigurację przy każdym żądaniu (widać w terminalu / CF Logs)
  console.log("[Newsletter] list IDs:", BREVO_LIST_IDS, "| has key:", !!apiKey);

  if (!apiKey) {
    console.error("[Newsletter] Brak BREVO_API_KEY w środowisku.");
    return NextResponse.json(
      { error: "Błąd konfiguracji serwera." },
      { status: 500 }
    );
  }

  if (BREVO_LIST_IDS.length === 0) {
    console.error("[Newsletter] Brak BREVO_LIST_IDS / BREVO_LIST_ID w środowisku.");
    return NextResponse.json(
      { error: "Błąd konfiguracji serwera." },
      { status: 500 }
    );
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowe dane żądania." },
      { status: 400 }
    );
  }

  const { email, name } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Podaj poprawny adres e-mail." },
      { status: 400 }
    );
  }

  try {
    // Atrybuty — tylko FIRSTNAME, bo SOURCE wymaga ręcznego utworzenia w Brevo
    // (Contacts → Configuration → Contact attributes → Add attribute)
    const attributes: Record<string, string> = {};
    if (name?.trim()) {
      attributes.FIRSTNAME = name.trim();
    }

    const payload: Record<string, unknown> = {
      email,
      listIds: BREVO_LIST_IDS,
      updateEnabled: true, // kontakt już istnieje → aktualizuj zamiast błędu
      tags: ["newsletter", "ilbuoncaffe.pl"],
      ...(Object.keys(attributes).length > 0 && { attributes }),
    };

    console.log("[Newsletter] →", JSON.stringify(payload));

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
    console.log("[Newsletter] ←", response.status, responseText);

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
    console.error("[Newsletter] Fetch error:", err);
    return NextResponse.json(
      { error: "Błąd połączenia z serwerem. Spróbuj ponownie później." },
      { status: 502 }
    );
  }
}
