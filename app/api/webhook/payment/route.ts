import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getFundingIntent, removeFundingIntent } from "@/lib/funding";
import { getWalletData, loadKeypair } from "@/lib/whatsapp-wallets";
import { USDC_MINT, USDT_MINT } from "@/lib/umbra";
import twilio from "twilio";
import { createDuneMemo, trackEvent } from "@/lib/analytics";

const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM!;
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendNotification(phone: string, message: string) {
  try {
    if (phone.includes("+") && process.env.TWILIO_AUTH_TOKEN) {
      const target = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
      await twilioClient.messages.create({ from: TWILIO_FROM, to: target, body: message });
    }
  } catch (e) {
    console.warn("Failed to send WhatsApp notification:", e);
  }
}

export async function POST(req: NextRequest) {
  const { intentId, status } = await req.json();
  if (status !== "success") return NextResponse.json({ error: "Payment not successful" }, { status: 400 });

  const intent = await getFundingIntent(intentId);
  if (!intent) return NextResponse.json({ error: "Invalid intent" }, { status: 404 });

  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://solana.publicnode.com";
  const conn = new Connection(rpc, "confirmed");

  // Load Master Treasury
  const treasuryKeyHex = process.env.MASTER_TREASURY_KEY;
  if (!treasuryKeyHex) {
    console.error("MASTER_TREASURY_KEY is missing!");
    return NextResponse.json({ error: "Treasury not configured" }, { status: 500 });
  }

  try {
    const treasury = Keypair.fromSecretKey(Buffer.from(treasuryKeyHex, "hex"));
    const walletData = await getWalletData(intent.phone);
    if (!walletData) throw new Error("Wallet not found for this intent");
    
    const userKeypair = loadKeypair(intent.phone, walletData.encryptedSecretKey);
    const destination = userKeypair.publicKey;
    const asset = intent.asset || "USDC";

    console.log(`[Webhook] Funding ${intent.phone} (${destination.toBase58()}) with ${intent.amount} ${asset}`);

    const tx = new Transaction();

    // 0. Add Dune Memo for analytics
    tx.add(createDuneMemo("fund", intent.phone.startsWith("whatsapp:") ? "whatsapp" : "ussd"));

    // 1. Check for SOL Gas Drip (0.02 SOL)
    const solBalance = await conn.getBalance(destination);
    if (solBalance < 0.01 * 1e9) {
      tx.add(SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: destination,
        lamports: 0.02 * 1e9,
      }));
      console.log("[Webhook] Adding 0.02 SOL gas drip");
    }

    // 2. Add Asset Transfer (Simulated here)
    // In a real app, use @solana/spl-token to transfer either USDC_MINT or USDT_MINT
    
    const sig = await sendAndConfirmTransaction(conn, tx, [treasury]);
    console.log("[Webhook] Transaction successful:", sig);

    // Track for Dune & Analytics
    await trackEvent("fund", { phone: intent.phone, amount: intent.amount, asset });

    // Notify user
    const shieldCmd = `shield ${intent.amount}${asset === "USDT" ? " usdt" : ""}`;
    await sendNotification(intent.phone, `💵 GhostFi Funding Successful! ✓\n\nYou received ${intent.amount} ${asset} and a small gas drip for fees.\n\nReply '${shieldCmd}' to make your balance private! 👻`);

    await removeFundingIntent(intentId);
    return NextResponse.json({ success: true, sig });
  } catch (e: any) {
    console.error("[Webhook] Fulfillment failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
