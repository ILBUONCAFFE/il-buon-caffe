import { NextRequest, NextResponse } from "next/server";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

// Obsługuje wiele list — oddziel ID przecinkami: BREVO_LIST_IDS="2,5"
// Fallback: pojedyncze BREVO_LIST_ID (wsteczna kompatybilność)
function parseListIds(): number[] {
  const multi = process.env.BREVO_LIST_IDS;
  if (multi) {
    return multi
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  }
  const single = process.env.BREVO_LIST_ID
    ? parseInt(process.env.BREVO_LIST_ID, 10)
    : 2;
  return [single];
}

const BREVO_LIST_IDS = parseListIds();

export async function POST(req: NextRequest) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Newsletter] Brak BREVO_API_KEY w środowisku.");
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
    const payload: Record<string, unknown> = {
      email,
      listIds: BREVO_LIST_IDS,
      updateEnabled: true, // jeśli kontakt istnieje — aktualizuj, nie zwracaj błędu
      // Tagi widoczne w Brevo → Contacts → Tags (nie wymagają konfiguracji)
      tags: ["newsletter", "ilbuoncaffe.pl"],
    };

    // Atrybuty kontaktu — SOURCE wymaga wcześniejszego utworzenia w Brevo:
    // Contacts → Configuration → Contact attributes → Add attribute (typ: Text, nazwa: SOURCE)
    const attributes: Record<string, string> = {
      SOURCE: "newsletter-website",
    };
    if (name?.trim()) {
      attributes.FIRSTNAME = name.trim();
    }
    payload.attributes = attributes;

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 204 || response.status === 201 || response.status === 200) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const data = await response.json().catch(() => ({}));

    // Brevo zwraca 400 gdy kontakt już istnieje bez updateEnabled — obsłużone wyżej
    console.error("[Newsletter] Brevo error:", response.status, data);
    return NextResponse.json(
      { error: data?.message ?? "Nie udało się zapisać. Spróbuj ponownie." },
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
