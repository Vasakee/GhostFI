import { NextRequest, NextResponse } from "next/server";

const JUPITER_MIRRORS = [
  "https://quote-api.jup.ag/v6",
  "https://api.jup.ag/v6",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let lastError = "";

    for (const mirror of JUPITER_MIRRORS) {
      try {
        const res = await fetch(`${mirror}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        if (res.ok) return NextResponse.json(await res.json());
        
        const text = await res.text();
        lastError = `Mirror ${mirror} error: ${text}`;
      } catch (e: any) {
        lastError = `Mirror ${mirror} failed: ${e.message}`;
        continue;
      }
    }

    return NextResponse.json({ error: "Failed to build swap on all mirrors.", details: lastError }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
