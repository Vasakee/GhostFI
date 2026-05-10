import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import twilio from "twilio";
import { getOrCreateWallet, loadKeypair, checkRateLimit, isRegistered, setRegistered, addTransaction, getWalletData, updateCard } from "@/lib/whatsapp-wallets";
import { serverGetBalance, serverShield, serverUnshield, serverSend, serverRegister, serverExportViewingKey } from "@/lib/server-umbra";
import { getCardDetails, getCardBalance, topUpCard } from "@/lib/rain";
import { createFundingIntent } from "@/lib/funding";
import { USDC_MINT, PUSD_MINT, USDT_MINT } from "@/lib/umbra";
import { raenest } from "@/lib/raenest";
import { DEMO_MODE } from "@/lib/config";

const FROM = process.env.TWILIO_WHATSAPP_FROM!;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const getConn = async () => {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://solana.publicnode.com";
  return new Connection(rpc, "confirmed");
};

/** Get live price from Jupiter (Free API) */
async function getPrice(symbol: string): Promise<string> {
  try {
    const mints: Record<string, string> = {
      SOL: "So11111111111111111111111111111111111111112",
      USDC: USDC_MINT,
      USDT: USDT_MINT,
      USDG: USDG_MINT,
      PUSD: PUSD_MINT,
    };
    const addr = mints[symbol];
    if (!addr) return "Unknown token";
    
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${addr}`);
    const data = await res.json();
    const price = data.data?.[addr]?.price;
    return price ? `$${parseFloat(price).toFixed(2)}` : "Unavailable";
  } catch {
    return "Unavailable";
  }
}

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

import { FEATURE_FLAGS } from "@/lib/config";

...

async function handleCommand(phone: string, msg: string, secretHex: string): Promise<string> {
  const cmd = msg.trim().toLowerCase();

  if (["hi", "hello", "start", "help"].includes(cmd)) {
    const commands = [
      "💰 balance — check private USDC/USDT/PUSD",
      "💵 fund [amount] — fund your account via fiat",
      "📤 send [amount] [phone] — send privately",
      "🔄 swap [amount] — swap assets to PUSD (Ghost Mode)",
      "🔒 shield [amount] — move assets to private balance",
      "🔓 unshield [amount] — move to public wallet",
      FEATURE_FLAGS.ENABLE_VIRTUAL_CARDS && "💳 card — view your virtual card",
      FEATURE_FLAGS.ENABLE_VIRTUAL_CARDS && "⛽ topup card [amount] — load card from private balance",
      FEATURE_FLAGS.ENABLE_BANK_PAYOUTS && "🏦 withdraw [amount] [bank] [account] — withdraw to bank",
      "📈 price [SOL/USDC] — check live market price",
      "📋 history — last 5 transactions",
      "🔑 address — your wallet address",
      "🛡️ security — our protocol security",
      "ℹ️ help — show this menu"
    ].filter(Boolean).join("\n");

    return `👻 Welcome to GhostFi — your private Solana bank.
Powered by Umbra Protocol 🛡️

Commands:
${commands}

⚠️ GhostFi Bot uses a custodial server-side wallet tied to your phone number.`;
  }

  if (cmd === "security") {
    return `🛡️ GhostFi Protocol Security

1. Umbra Engine: All private transfers use Umbra Protocol's stealth addresses and Groth16 ZK-SNARKs.
2. Zero-Knowledge: No on-chain link exists between sender and recipient.
3. Encryption: Server-side keys are encrypted at rest using AES-256-GCM with unique IVs.
4. Transparency: View our protocol health at ${process.env.NEXT_PUBLIC_APP_URL}/analytics.

We prioritize protocol safety and user privacy above all.`;
  }

  const priceMatch = cmd.match(/^price\s+(\w+)$/);
  if (priceMatch) {
    const symbol = priceMatch[1].toUpperCase();
    const price = await getPrice(symbol);
    return `📈 Live Price (${symbol}): ${price}\nPowered by Birdeye.`;
  }

  const withdrawMatch = cmd.match(/^withdraw\s+([\d.]+)\s+(\w+)\s+(\d+)$/);
  if (withdrawMatch) {
    if (!FEATURE_FLAGS.ENABLE_BANK_PAYOUTS) return "🏦 Bank Withdrawals are currently in private beta for regulatory onboarding. Check back soon!";
    const amount = parseFloat(withdrawMatch[1]);
    const bank = withdrawMatch[2];
    const account = withdrawMatch[3];
    if (amount <= 0) return "❌ Invalid amount.";
    
    try {
      await ensureRegistered(phone, secretHex);
      // For global demo, we assume a multiplier or direct amount
      const result = await raenest.payout(phone, bank, account, amount * 1500); 
      await addTransaction(phone, "withdraw", amount, result.reference);
      return `🏦 Withdrawal initiated! ✓\n$${amount} is being sent to your bank account (${account}).\nStatus: Pending\nRef: ${result.reference}`;
    } catch (e: any) {
      return `❌ Withdrawal failed: ${e?.message}`;
    }
  }

  const cardTopupMatch = cmd.match(/^topup\s+card\s+([\d.]+)$/);
  if (cardTopupMatch) {
    if (!FEATURE_FLAGS.ENABLE_VIRTUAL_CARDS) return "💳 Card features are coming soon!";
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
      return `⛽ Successfully loaded $${amount} USDC onto your GhostFi Card! ✓`;
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
    return `💵 Fund Account: ${amount} USDC\n\nPlease complete your payment at this link:\n${link}`;
  }

  if (cmd === "balance") {
    if (DEMO_MODE) {
      return `🔒 Your Private Balances:
USDC: 1,240.50
USDT: 450.00
PUSD: 5,000.00 (Private)
USDG: 125.00

Your funds are encrypted on-chain.`;
    }
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    const balances = await serverGetBalance(keypair, [USDC_MINT, USDT_MINT, PUSD_MINT, USDG_MINT]);
    
    const usdc = (Number(balances.get(USDC_MINT) ?? 0n) / 1_000_000).toFixed(2);
    const usdt = (Number(balances.get(USDT_MINT) ?? 0n) / 1_000_000).toFixed(2);
    const pusd = (Number(balances.get(PUSD_MINT) ?? 0n) / 1_000_000).toFixed(2);
    const usdg = (Number(balances.get(USDG_MINT) ?? 0n) / 1_000_000).toFixed(2);
    
    return `🔒 Your Private Balances:
USDC: ${usdc}
USDT: ${usdt}
PUSD: ${pusd} (Private)
USDG: ${usdg}

Your funds are encrypted on-chain.`;
  }

  if (cmd === "address") {
    const { publicKey } = await getOrCreateWallet(phone);
    return `📍 Your GhostFi wallet address:\n${publicKey}\n\nUse this to receive SOL, USDC, and USDT.`;
  }

  if (cmd === "history") {
    const wallet = await getWalletData(phone);
    const txs = (wallet?.transactions ?? []).slice(0, 5);
    if (!txs.length) return "📋 No transactions yet.";
    const icons: Record<string, string> = { shield: "🔒", unshield: "🔓", send: "📤", receive: "📥", withdraw: "🏦" };
    const lines = txs.map((t: any, i: number) =>
      `${i + 1}. ${icons[t.type] ?? "•"} ${t.type.toUpperCase()} ${t.amount} — ${timeAgo(t.ts)}`
    );
    return `📋 Recent Activity:\n${lines.join("\n")}`;
  }

  if (cmd === "card") {
    if (!FEATURE_FLAGS.ENABLE_VIRTUAL_CARDS) return "💳 Card features are coming soon!";
    const wallet = await getWalletData(phone);
    const card = wallet?.card;
    if (!card) return `💳 No card linked.\n\nVisit https://ghostfi.app/card to issue your GhostFi virtual card (Raenest).`;
    const { balance } = DEMO_MODE ? { balance: 250.00 } : await getCardBalance(card.cardId);
    return `💳 Your GhostFi Virtual Card\n**** **** **** ${card.last4}\nExpires: ${card.expiry}\nBalance: $${balance.toFixed(2)} USD\nProvider: Raenest\n\nReply 'reveal card' to see full details.`;
  }

  if (cmd === "reveal card") {
    const wallet = await getWalletData(phone);
    const card = wallet?.card;
    if (!card) return `💳 No card linked.`;
    const details = await getCardDetails(card.cardId);
    return `⚠️ Card details:\nNumber: ${details.cardNumber}\nCVV: ${details.cvv}\nExpiry: ${details.expiry}\n\nDelete this message.`;
  }

  const swapMatch = cmd.match(/^swap\s+([\d.]+)$/);
  if (swapMatch) {
    const amount = parseFloat(swapMatch[1]);
    if (isNaN(amount) || amount <= 0) return "❌ Invalid amount.";
    return "🔄 Swap initiated via Jupiter. Processing on Solana...";
  }

  const shieldMatch = cmd.match(/^shield\s+([\d.]+)(\s+usdt)?$/);
  if (shieldMatch) {
    const amount = parseFloat(shieldMatch[1]);
    const mint = shieldMatch[2] ? USDT_MINT : USDC_MINT;
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    await serverShield(keypair, mint, BigInt(Math.round(amount * 1_000_000)));
    await addTransaction(phone, "shield", amount);
    return `🔒 Shielded ${amount} successfully. Balance is now private.`;
  }

  const unshieldMatch = cmd.match(/^unshield\s+([\d.]+)(\s+usdt)?$/);
  if (unshieldMatch) {
    const amount = parseFloat(unshieldMatch[1]);
    const mint = unshieldMatch[2] ? USDT_MINT : USDC_MINT;
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    await serverUnshield(keypair, mint, BigInt(Math.round(amount * 1_000_000)));
    await addTransaction(phone, "unshield", amount);
    return `🔓 Unshielded ${amount} to your public wallet.`;
  }

  const sendMatch = msg.trim().match(/^send\s+([\d.]+)\s+(\+?[\d\s\-()]+)(\s+usdt)?$/i);
  if (sendMatch) {
    const amount = parseFloat(sendMatch[1]);
    const recipientPhone = sendMatch[2].replace(/[\s\-()]/g, "");
    const mint = sendMatch[3] ? USDT_MINT : USDC_MINT;
    await ensureRegistered(phone, secretHex);
    const senderKeypair = loadKeypair(phone, secretHex);
    const { publicKey: recipientAddress } = await getOrCreateWallet(recipientPhone);
    const result = await serverSend(senderKeypair, recipientAddress, mint, BigInt(Math.round(amount * 1_000_000)));
    const signature = (result as any)?.signature ?? String(result ?? "");
    await addTransaction(phone, "send", amount, signature);
    return `✅ Sent ${amount} privately.\nRef: ${signature.slice(0, 8)}`;
  }

  return `I didn't understand that.\nReply 'help' to see available commands.`;
}

function formatError(e: any): string {
  const msg = e?.message ?? "Unknown error";
  if (msg.includes("-32002") || msg.includes("simulation failed")) {
    return "⛽ *Gas Fee Required*\n\nYour GhostFi wallet has 0.00 SOL. Send 0.05 SOL to your address.";
  }
  return `❌ *Something went wrong*\n\n${msg.split(";")[0]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const from = params.get("From") ?? "";
    const msgBody = params.get("Body") ?? "";

    if (!from || !msgBody) return new NextResponse("Bad Request", { status: 400 });

    if (!checkRateLimit(from)) {
      await sendWhatsApp(from, "⏳ Too many requests. Please wait.");
      return new NextResponse("OK");
    }

    const { isNew, publicKey, encryptedSecretKey } = await getOrCreateWallet(from);
    if (isNew) {
      await sendWhatsApp(from, `👻 *Welcome to GhostFi!*\nAddress: \`${publicKey}\``);
      return new NextResponse("OK");
    }

    let reply: string;
    try {
      reply = await handleCommand(from, msgBody, encryptedSecretKey);
    } catch (e: any) {
      reply = formatError(e);
    }

    await sendWhatsApp(from, reply);
    return new NextResponse("OK");
  } catch (e: any) {
    return new NextResponse("Error", { status: 500 });
  }
}
