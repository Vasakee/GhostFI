import { NextRequest, NextResponse } from "next/server";

const CDN_BASE = "https://d3j9fjdkre529f.cloudfront.net";

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `${CDN_BASE}/${path}`;

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return new NextResponse(`Failed to fetch ${url}: ${upstream.status}`, { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
