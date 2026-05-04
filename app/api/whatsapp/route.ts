import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair } from "@solana/web3.js";
import twilio from "twilio";
import { getOrCreateWallet, loadKeypair, checkRateLimit, isRegistered, setRegistered, addTransaction, getWalletData, updateCard } from "@/lib/whatsapp-wallets";
import { serverGetBalance, serverShield, serverUnshield, serverSend, serverRegister, serverExportViewingKey } from "@/lib/server-umbra";
import { getCardDetails, getCardBalance, topUpCard } from "@/lib/rain";
import { createFundingIntent } from "@/lib/funding";
import { USDC_MINT } from "@/lib/umbra";

const FROM = process.env.TWILIO_WHATSAPP_FROM!;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const getConn = async () => {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://solana.publicnode.com";
  return new Connection(rpc, "confirmed");
};

async function sendWhatsApp(to: string, body: string) {
  await client.messages.create({
    from: FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`,
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    body,
  });
}

async function ensureRegistered(phone: string, secretHex: string) {
  if (isRegistered(phone)) return;
  const keypair = loadKeypair(phone, secretHex);
  await serverRegister(keypair);
  await setRegistered(phone);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function handleCommand(phone: string, msg: string, secretHex: string): Promise<string> {
  const cmd = msg.trim().toLowerCase();

  if (["hi", "hello", "start", "help"].includes(cmd)) {
    return `👻 Welcome to GhostFi — your private Solana bank.

Commands:
💰 balance — check your private balance
💵 fund [amount] — fund your account via fiat
📤 send [amount] [phone] — send USDC privately
🔒 shield [amount] — move USDC to private balance
🔓 unshield [amount] — move to public wallet
💳 card — view your virtual card
⛽ topup card [amount] — load card from private balance
📋 history — last 5 transactions
🔑 address — your wallet address
ℹ️ help — show this menu

⚠️ GhostFi Bot uses a custodial server-side wallet tied to your phone number.`;
  }

  const cardTopupMatch = cmd.match(/^topup\s+card\s+([\d.]+)$/);
  if (cardTopupMatch) {
    const amount = parseFloat(cardTopupMatch[1]);
    if (amount <= 0) return "❌ Invalid amount.";
    const wallet = await getWalletData(phone);
    const card = wallet?.card;
    if (!card) return "💳 No card linked. Visit https://ghostfi.app/card first.";
    
    try {
      await ensureRegistered(phone, secretHex);
      const keypair = loadKeypair(phone, secretHex);
      await serverUnshield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
      await topUpCard(card.cardId, amount);
      await addTransaction(phone, "card_topup", amount);
      return `⛽ Successfully loaded $${amount} USDC onto your GhostFi Card! ✓\nYour card balance is updated.`;
    } catch (e: any) {
      return `❌ Card top-up failed: ${e?.message ?? "insufficient private balance"}`;
    }
  }

  const fundMatch = cmd.match(/^fund\s+([\d.]+)$/);
  if (fundMatch) {
    const amount = parseFloat(fundMatch[1]);
    if (amount <= 0) return "❌ Invalid amount.";
    const intentId = createFundingIntent(phone, amount);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/checkout?intent=${intentId}`;
    return `💵 Fund Account: ${amount} USDC\n\nPlease complete your payment at this link:\n${link}\n\nOnce finished, your balance will be updated automatically.`;
  }

  if (cmd === "balance") {
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    const balances = await serverGetBalance(keypair, [USDC_MINT]);
    const raw = balances.get(USDC_MINT) ?? 0n;
    const amount = (Number(raw) / 1_000_000).toFixed(2);
    return `🔒 Private Balance: ${amount} USDC\nYour funds are encrypted on-chain.`;
  }

  if (cmd === "address") {
    const { publicKey } = await getOrCreateWallet(phone);
    return `📍 Your GhostFi wallet address:\n${publicKey}\n\nUse this to receive SOL and USDC.`;
  }

  if (cmd === "history") {
    const wallet = await getWalletData(phone);
    const txs = (wallet?.transactions ?? []).slice(0, 5);
    if (!txs.length) return "📋 No transactions yet.";
    const icons: Record<string, string> = { shield: "🔒", unshield: "🔓", send: "📤", receive: "📥" };
    const lines = txs.map((t: any, i: number) =>
      `${i + 1}. ${icons[t.type] ?? "•"} ${t.type === "send" ? "Sent" : t.type.charAt(0).toUpperCase() + t.type.slice(1)} ${t.amount} USDC — ${timeAgo(t.ts)}`
    );
    return `📋 Recent Activity:\n${lines.join("\n")}`;
  }

  if (cmd === "card") {
    const wallet = await getWalletData(phone);
    const card = wallet?.card;
    if (!card) return `💳 No card linked.\n\nVisit https://ghostfi.app/card to issue your GhostFi virtual card first.`;
    const { balance } = await getCardBalance(card.cardId);
    return `💳 Your GhostFi Virtual Card\n**** **** **** ${card.last4}\nExpires: ${card.expiry}\nBalance: $${balance.toFixed(2)} USDC\n\nReply 'reveal card' to see full details.`;
  }

  if (cmd === "reveal card") {
    const wallet = await getWalletData(phone);
    const card = wallet?.card;
    if (!card) return `💳 No card linked. Visit https://ghostfi.app/card first.`;
    const details = await getCardDetails(card.cardId);
    return `⚠️ Card details (delete this message after noting):\nNumber: ${details.cardNumber}\nCVV: ${details.cvv}\nExpiry: ${details.expiry}\n\nThis message is your responsibility to delete.`;
  }

  const shieldMatch = cmd.match(/^shield\s+([\d.]+)$/);
  if (shieldMatch) {
    const amount = parseFloat(shieldMatch[1]);
    if (isNaN(amount) || amount <= 0) return "❌ Invalid amount.";
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    await serverShield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
    await addTransaction(phone, "shield", amount);
    return `🔒 Shielded ${amount} USDC successfully.\nYour balance is now private.`;
  }

  const unshieldMatch = cmd.match(/^unshield\s+([\d.]+)$/);
  if (unshieldMatch) {
    const amount = parseFloat(unshieldMatch[1]);
    if (isNaN(amount) || amount <= 0) return "❌ Invalid amount.";
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    await serverUnshield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
    await addTransaction(phone, "unshield", amount);
    return `🔓 Unshielded ${amount} USDC to your public wallet.`;
  }

  const sendMatch = msg.trim().match(/^send\s+([\d.]+)\s+(\+?[\d\s\-()]+)$/i);
  if (sendMatch) {
    const amount = parseFloat(sendMatch[1]);
    const recipientPhone = sendMatch[2].replace(/[\s\-()]/g, "");
    if (isNaN(amount) || amount <= 0) return "❌ Invalid amount.";
    await ensureRegistered(phone, secretHex);
    const senderKeypair = loadKeypair(phone, secretHex);
    const { publicKey: recipientAddress } = await getOrCreateWallet(recipientPhone);
    const result = await serverSend(senderKeypair, recipientAddress, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
    const signature = (result as any)?.signature ?? String(result ?? "");
    await addTransaction(phone, "send", amount, signature);
    return `✅ Sent ${amount} USDC privately.\nTransaction is confidential on-chain.\nReference: ${signature.slice(0, 8)}`;
  }

  return `I didn't understand that.\nReply 'help' to see available commands.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const twilioSig = req.headers.get("x-twilio-signature") ?? "";
    const webhookUrl = process.env.WHATSAPP_WEBHOOK_SECRET
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp`
      : null;
    if (webhookUrl && process.env.TWILIO_AUTH_TOKEN) {
      const params = Object.fromEntries(new URLSearchParams(body));
      const valid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, twilioSig, webhookUrl, params);
      if (!valid) return new NextResponse("Forbidden", { status: 403 });
    }

    const params = new URLSearchParams(body);
    const from = params.get("From") ?? "";
    const msgBody = params.get("Body") ?? "";

    if (!from || !msgBody) return new NextResponse("Bad Request", { status: 400 });

    if (!checkRateLimit(from)) {
      await sendWhatsApp(from, "⏳ Too many requests. Please wait a minute and try again.");
      return new NextResponse("OK");
    }

    const { isNew, publicKey, encryptedSecretKey } = await getOrCreateWallet(from);
    if (isNew) {
      await sendWhatsApp(from,
        `👻 Welcome to GhostFi!\n\n` +
        `Your private Solana wallet has been created and linked to your phone number.\n\n` +
        `📍 Your wallet address:\n${publicKey}\n\n` +
        `⚠️ This is a custodial wallet — GhostFi holds your encrypted key server-side. ` +
        `Never send large amounts without understanding the risks.\n\n` +
        `Reply 'help' to see all commands.`
      );
      return new NextResponse("OK");
    }

    let reply: string;
    try {
      reply = await handleCommand(from, msgBody, encryptedSecretKey);
    } catch (e: any) {
      console.error("[whatsapp] command error:", e?.message);
      reply = `❌ Something went wrong: ${e?.message ?? "unknown error"}\n\nPlease try again or reply 'help'.`;
    }

    await sendWhatsApp(from, reply);
    return new NextResponse("OK");
  } catch (e: any) {
    console.error("[whatsapp] fatal:", e?.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
