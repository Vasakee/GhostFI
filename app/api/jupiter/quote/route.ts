import { NextRequest, NextResponse } from "next/server";

// This helps bypass local ISP blocks by resolving the IP via Cloudflare DNS-over-HTTPS
async function resolveViaDoh(domain: string) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: { "accept": "application/dns-json" }
    });
    const data = await res.json();
    return data.Answer?.[0]?.data; // Return the first IP address found
  } catch (e) {
    return null;
  }
}

const JUPITER_MIRRORS = [
  "https://quote-api.jup.ag/v6",
  "https://api.jup.ag/v6",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.toString();

  // Try standard mirrors first
  for (const mirror of JUPITER_MIRRORS) {
    try {
      const res = await fetch(`${mirror}/quote?${query}`, {
        headers: { "Accept": "application/json" },
        next: { revalidate: 0 }
      });
      if (res.ok) return NextResponse.json(await res.json());
    } catch (e: any) {
      console.warn(`[Jupiter Proxy] Standard fetch failed for ${mirror}:`, e.message);
      continue;
    }
  }

  // If we reach here, DNS is likely blocked. Check if we can reach Cloudflare to confirm internet.
  const cloudflareIp = await resolveViaDoh("quote-api.jup.ag");
  
  if (cloudflareIp) {
    return NextResponse.json({ 
      error: "Your local ISP is blocking Jupiter (jup.ag).", 
      details: `We found Jupiter at ${cloudflareIp} via Cloudflare, but your system DNS cannot see it.`,
      advice: "Good news: This will work perfectly once you deploy to Vercel/Production. For localhost, please use a VPN or change your DNS to 8.8.8.8."
    }, { status: 502 });
  }

  return NextResponse.json({ 
    error: "Jupiter is unreachable from your network.", 
    details: "All mirrors failed and DNS-over-HTTPS lookup also failed." 
  }, { status: 502 });
}


