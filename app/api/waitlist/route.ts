import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import { Waitlist, generateReferralCode } from "@/lib/waitlist-model";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip + "ghostfi-salt").digest("hex").slice(0, 16);
}

async function sendConfirmationEmail(name: string, email: string, position: number) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "GhostFi <noreply@ghostfi.live>",
      to: email,
      subject: "You're on the GhostFi waitlist 👻",
      text: `Hey ${name},\n\nYou're #${position} on the GhostFi waitlist.\n\nWe're putting the final touches on private banking for Solana. When we're ready, you'll be the first to know.\n\nWhile you wait — follow us on Twitter for updates:\n@GhostFi_xyz\n\nYour money. Your business.\n— The GhostFi Team\n\nghostfi.live`,
    }),
  }).catch(() => {});
}

export async function GET() {
  await dbConnect();
  const count = await Waitlist.countDocuments();
  return NextResponse.json({ count });
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  const { name, email, phone, country, referralSource, ref } = body;

  if (!name || name.trim().length < 2)
    return NextResponse.json({ success: false, error: "Name must be at least 2 characters" }, { status: 400 });
  if (!email || !isValidEmail(email))
    return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
  if (!country)
    return NextResponse.json({ success: false, error: "Country required" }, { status: 400 });

  await dbConnect();

  // Check duplicate
  const existing = await Waitlist.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({
      success: false,
      error: "Email already registered",
      position: existing.position,
      referralCode: existing.referralCode,
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "";
  const position = (await Waitlist.countDocuments()) + 1;
  const referralCode = generateReferralCode();

  await Waitlist.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ?? "",
    country,
    referralSource: referralSource ?? "",
    position,
    ipHash: hashIp(ip),
    referralCode,
    referredBy: ref ?? "",
  });

  if (ref) {
    await Waitlist.updateOne({ referralCode: ref }, { $inc: { referralCount: 1, position: -5 } });
  }

  sendConfirmationEmail(name.trim(), email.toLowerCase().trim(), position);

  return NextResponse.json({
    success: true,
    position,
    referralCode,
    message: `You're #${position} on the waitlist!`,
  });
  } catch (e: any) {
    console.error("[waitlist]", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
