import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWallet, loadKeypair, checkRateLimit, isRegistered, setRegistered } from "@/lib/whatsapp-wallets";
import { getSession, updateSession, clearSession, parseMenuLevel } from "@/lib/ussd-sessions";
import { serverGetBalance, serverShield, serverUnshield, serverSend, serverRegister } from "@/lib/server-umbra";
import { getCardDetails, getCardBalance, freezeCard, unfreezeCard, topUpCard } from "@/lib/rain";
import { createFundingIntent } from "@/lib/funding";
// #6 — use the network-aware mint from the shared constant
import { USDC_MINT } from "@/lib/umbra";
// #13 — real tx history from the WhatsApp route's shared store
import { getTxHistory } from "@/app/api/whatsapp/route";

const CON = (text: string) => new NextResponse(`CON ${text}`, { headers: { "Content-Type": "text/plain" } });
const END = (text: string) => new NextResponse(`END ${text}`, { headers: { "Content-Type": "text/plain" } });

const MAIN_MENU = `Welcome to GhostFi 👻
Private banking on Solana

1. Check Balance
2. Send Money
3. Fund Account
4. Shield Funds
5. Unshield Funds
6. My Virtual Card
7. Transaction History
0. Exit`;

// #8 — ensure wallet is registered with Umbra before any SDK operation
async function ensureRegistered(phone: string) {
  if (isRegistered(phone)) return;
  const keypair = loadKeypair(phone);
  await serverRegister(keypair);
  setRegistered(phone);
}

async function getUsdcBalance(phone: string): Promise<string> {
  try {
    await ensureRegistered(phone);
    const keypair = loadKeypair(phone);
    const balances = await serverGetBalance(keypair, [USDC_MINT]);
    const raw = balances.get(USDC_MINT) ?? 0n;
    return (Number(raw) / 1_000_000).toFixed(2);
  } catch {
    return "0.00";
  }
}

// In-memory card store — replace with DB for production (issue #4)
const cardStore = new Map<string, { cardId: string; last4: string; expiry: string; status: string }>();

async function sendSms(phone: string, message: string) {
  const AT_USERNAME = process.env.AT_USERNAME ?? "sandbox";
  const AT_API_KEY = process.env.AT_API_KEY ?? "";
  await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey: AT_API_KEY, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: AT_USERNAME, to: phone, message }),
  });
}

function formatTxHistory(phone: string): string {
  const txs = getTxHistory(phone).slice(0, 3);
  if (!txs.length) return "No transactions yet.";
  const icons: Record<string, string> = { shield: "+", unshield: "-", send: ">", receive: "<" };
  return txs.map((t, i) => {
    const ago = (() => {
      const h = Math.floor((Date.now() - t.ts) / 3_600_000);
      return h < 1 ? "now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
    })();
    return `${i + 1}. ${icons[t.type] ?? "•"} ${t.type} ${t.amount} USDC - ${ago}`;
  }).join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const sessionId = params.get("sessionId") ?? "";
  const phoneNumber = params.get("phoneNumber") ?? "";
  const text = params.get("text") ?? "";

  if (!phoneNumber) return END("Session error. Please try again.");

  // #10 — validate Africa's Talking username to reject spoofed requests
  const incomingUsername = params.get("username");
  if (incomingUsername && incomingUsername !== (process.env.AT_USERNAME ?? "sandbox")) {
    return END("Unauthorized.");
  }

  if (!checkRateLimit(phoneNumber)) {
    return END("Too many requests. Please wait a minute.");
  }

  getOrCreateWallet(phoneNumber);

  const { level, inputs } = parseMenuLevel(text);

  if (level === 0) {
    updateSession(sessionId, { phoneNumber, currentMenu: "main" });
    return CON(MAIN_MENU);
  }

  const choice = inputs[0];

  if (choice === "0") {
    clearSession(sessionId);
    return END("Thank you for using GhostFi.\nYour money. Your business. 👻");
  }

  // 1: Check Balance
  if (choice === "1") {
    const amount = await getUsdcBalance(phoneNumber);
    clearSession(sessionId);
    return END(`Your Private Balance:\n${amount} USDC\n\nEncrypted on Solana blockchain.\nVisible only to you.`);
  }

  // 2: Send Money
  if (choice === "2") {
    if (level === 1) return CON(`Send Private Transfer\n\nEnter recipient phone number:\n(include country code e.g. 2348012345678)`);
    if (level === 2) return CON(`Enter amount to send (USDC):`);
    if (level === 3) {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount. Please try again.");
      return CON(`Confirm private transfer:\nTo: +${inputs[1]}\nAmount: ${amount} USDC\nFee: ~0.001 SOL\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 4) {
      if (inputs[3] === "2") { clearSession(sessionId); return END("Transfer cancelled."); }
      if (inputs[3] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[2]);
      try {
        await ensureRegistered(phoneNumber);
        const keypair = loadKeypair(phoneNumber);
        const { publicKey: recipientAddress } = getOrCreateWallet(inputs[1]);
        const result = await serverSend(keypair, recipientAddress, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        const ref = String((result as any)?.signature ?? result ?? "").slice(0, 8) || "ghostfi";
        clearSession(sessionId);
        return END(`Transfer successful! ✓\nSent ${amount} USDC privately.\nTransaction is confidential.\nRef: ${ref}`);
      } catch (e: any) {
        clearSession(sessionId);
        return END(`Transfer failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  // 3: Fund Account
  if (choice === "3") {
    if (level === 1) return CON("Fund your GhostFi account\n\nEnter amount in USDC:");
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      const intentId = createFundingIntent(phoneNumber, amount);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const link = `${baseUrl}/checkout?intent=${intentId}`;
      
      // Send the link via SMS
      await sendSms(phoneNumber, `💵 GhostFi Funding\n\nTo fund your account with ${amount} USDC, please complete payment here:\n${link}`);
      
      clearSession(sessionId);
      return END(`Payment link sent! ✓\nCheck your SMS for the checkout link to fund ${amount} USDC.`);
    }
  }

  // 4: Shield Funds
  if (choice === "4") {
    if (level === 1) {
      const balance = await getUsdcBalance(phoneNumber);
      return CON(`Shield Funds\nMove USDC to private balance\n\nPublic USDC balance: ${balance}\n\nEnter amount to shield:`);
    }
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm shielding:\nAmount: ${amount} USDC\nYour balance becomes private.\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 3) {
      if (inputs[2] === "2") { clearSession(sessionId); return END("Cancelled."); }
      if (inputs[2] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[1]);
      try {
        await ensureRegistered(phoneNumber);
        const keypair = loadKeypair(phoneNumber);
        await serverShield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        clearSession(sessionId);
        return END(`Shielding successful! ✓\n${amount} USDC is now private.\nBalance encrypted on-chain.`);
      } catch (e: any) {
        clearSession(sessionId);
        return END(`Shielding failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  // 5: Unshield Funds
  if (choice === "5") {
    if (level === 1) {
      const balance = await getUsdcBalance(phoneNumber);
      return CON(`Unshield Funds\nMove to public wallet\n\nPrivate balance: ${balance} USDC\n\nEnter amount to unshield:`);
    }
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm unshielding:\nAmount: ${amount} USDC\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 3) {
      if (inputs[2] === "2") { clearSession(sessionId); return END("Cancelled."); }
      if (inputs[2] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[1]);
      try {
        await ensureRegistered(phoneNumber);
        const keypair = loadKeypair(phoneNumber);
        await serverUnshield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        clearSession(sessionId);
        return END(`Unshielding successful! ✓\n${amount} USDC moved to public wallet.`);
      } catch (e: any) {
        clearSession(sessionId);
        return END(`Unshielding failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  // 6: Virtual Card
  if (choice === "6") {
    const card = cardStore.get(phoneNumber);
    if (level === 1) {
      if (!card) return END("No card linked.\nVisit ghostfi.app/card to issue your card.");
      const { balance } = await getCardBalance(card.cardId);
      return CON(`My GhostFi Card\n\nCard: **** **** **** ${card.last4}\nBalance: $${balance.toFixed(2)} USDC\nStatus: ${card.status === "frozen" ? "Frozen" : "Active"}\n\n1. Top up card\n2. Freeze/Unfreeze card\n3. View card details (SMS)\n4. Back`);
    }
    if (level === 2) {
      if (inputs[1] === "4") { clearSession(sessionId); return CON(MAIN_MENU); }
      if (!card) return END("No card found.");
      if (inputs[1] === "1") return CON("Enter top-up amount (USDC):");
      if (inputs[1] === "2") {
        const isFrozen = card.status === "frozen";
        if (isFrozen) await unfreezeCard(card.cardId); else await freezeCard(card.cardId);
        card.status = isFrozen ? "active" : "frozen";
        clearSession(sessionId);
        return END(`Card ${isFrozen ? "unfrozen ✓" : "frozen ✓"}`);
      }
      if (inputs[1] === "3") {
        const details = await getCardDetails(card.cardId);
        await sendSms(phoneNumber, `GhostFi Card Details\nNumber: ${details.cardNumber}\nCVV: ${details.cvv}\nExpiry: ${details.expiry}\n\nDelete this SMS after noting your details.`);
        clearSession(sessionId);
        return END("Card details sent to your phone via SMS.\nDelete the SMS after noting your details.");
      }
    }
    if (level === 3 && inputs[1] === "1") {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0 || !card) return END("Invalid amount.");
      await topUpCard(card.cardId, amount);
      clearSession(sessionId);
      return END(`Card topped up with $${amount} USDC ✓`);
    }
  }

  // 7: Transaction History — #13 real data
  if (choice === "7") {
    clearSession(sessionId);
    return END(`Recent Transactions:\n${formatTxHistory(phoneNumber)}`);
  }

  clearSession(sessionId);
  return END("Invalid option. Please dial again.");
}
