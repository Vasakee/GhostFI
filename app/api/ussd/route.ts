import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWallet, loadKeypair, checkRateLimit, isRegistered, setRegistered, addTransaction, getWalletData, updateCard } from "@/lib/whatsapp-wallets";
import { getSession, updateSession, clearSession, parseMenuLevel } from "@/lib/ussd-sessions";
import { serverGetBalance, serverShield, serverUnshield, serverSend, serverRegister } from "@/lib/server-umbra";
import { getCardDetails, getCardBalance, freezeCard, unfreezeCard, topUpCard } from "@/lib/rain";
import { createFundingIntent } from "@/lib/funding";
import { USDC_MINT } from "@/lib/umbra";

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

async function ensureRegistered(phone: string, secretHex: string) {
  if (isRegistered(phone)) return;
  const keypair = loadKeypair(phone, secretHex);
  await serverRegister(keypair);
  await setRegistered(phone);
}

async function getUsdcBalance(phone: string, secretHex: string): Promise<string> {
  try {
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    const balances = await serverGetBalance(keypair, [USDC_MINT]);
    const raw = balances.get(USDC_MINT) ?? 0n;
    return (Number(raw) / 1_000_000).toFixed(2);
  } catch {
    return "0.00";
  }
}

async function sendSms(phone: string, message: string) {
  const AT_USERNAME = process.env.AT_USERNAME ?? "sandbox";
  const AT_API_KEY = process.env.AT_API_KEY ?? "";
  await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey: AT_API_KEY, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: AT_USERNAME, to: phone, message }),
  });
}

function formatTxHistory(wallet: any): string {
  const txs = wallet.transactions.slice(0, 3);
  if (!txs.length) return "No transactions yet.";
  const icons: Record<string, string> = { shield: "+", unshield: "-", send: ">", receive: "<" };
  return txs.map((t: any, i: number) => {
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

  const incomingUsername = params.get("username");
  if (incomingUsername && incomingUsername !== (process.env.AT_USERNAME ?? "sandbox")) {
    return END("Unauthorized.");
  }

  if (!checkRateLimit(phoneNumber)) {
    return END("Too many requests. Please wait a minute.");
  }

  const { publicKey, encryptedSecretKey } = await getOrCreateWallet(phoneNumber);
  const { level, inputs } = parseMenuLevel(text);

  if (level === 0) {
    await updateSession(sessionId, { phoneNumber, currentMenu: "main" });
    return CON(MAIN_MENU);
  }

  const choice = inputs[0];

  if (choice === "0") {
    await clearSession(sessionId);
    return END("Thank you for using GhostFi.\nYour money. Your business. 👻");
  }

  if (choice === "1") {
    const amount = await getUsdcBalance(phoneNumber, encryptedSecretKey);
    await clearSession(sessionId);
    return END(`Your Private Balance:\n${amount} USDC\n\nEncrypted on Solana blockchain.\nVisible only to you.`);
  }

  if (choice === "2") {
    if (level === 1) return CON(`Send Private Transfer\n\nEnter recipient phone number:\n(include country code e.g. 2348012345678)`);
    if (level === 2) return CON(`Enter amount to send (USDC):`);
    if (level === 3) {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount. Please try again.");
      return CON(`Confirm private transfer:\nTo: +${inputs[1]}\nAmount: ${amount} USDC\nFee: ~0.001 SOL\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 4) {
      if (inputs[3] === "2") { await clearSession(sessionId); return END("Transfer cancelled."); }
      if (inputs[3] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[2]);
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        const { publicKey: recipientAddress } = await getOrCreateWallet(inputs[1]);
        const result = await serverSend(keypair, recipientAddress, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        const signature = (result as any)?.signature ?? String(result ?? "");
        await addTransaction(phoneNumber, "send", amount, signature);
        await clearSession(sessionId);
        return END(`Transfer successful! ✓\nSent ${amount} USDC privately.\nTransaction is confidential.\nRef: ${signature.slice(0, 8)}`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Transfer failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  if (choice === "3") {
    if (level === 1) return CON("Fund your GhostFi account\n\nEnter amount in USDC:");
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      const intentId = createFundingIntent(phoneNumber, amount);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const link = `${baseUrl}/checkout?intent=${intentId}`;
      await sendSms(phoneNumber, `💵 GhostFi Funding\n\nTo fund your account with ${amount} USDC, please complete payment here:\n${link}`);
      await clearSession(sessionId);
      return END(`Payment link sent! ✓\nCheck your SMS for the checkout link to fund ${amount} USDC.`);
    }
  }

  if (choice === "4") {
    if (level === 1) {
      const balance = await getUsdcBalance(phoneNumber, encryptedSecretKey);
      return CON(`Shield Funds\nMove USDC to private balance\n\nPublic USDC balance: ${balance}\n\nEnter amount to shield:`);
    }
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm shielding:\nAmount: ${amount} USDC\nYour balance becomes private.\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 3) {
      if (inputs[2] === "2") { await clearSession(sessionId); return END("Cancelled."); }
      if (inputs[2] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[1]);
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        await serverShield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        await addTransaction(phoneNumber, "shield", amount);
        await clearSession(sessionId);
        return END(`Shielding successful! ✓\n${amount} USDC is now private.\nBalance encrypted on-chain.`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Shielding failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  if (choice === "5") {
    if (level === 1) {
      const balance = await getUsdcBalance(phoneNumber, encryptedSecretKey);
      return CON(`Unshield Funds\nMove to public wallet\n\nPrivate balance: ${balance} USDC\n\nEnter amount to unshield:`);
    }
    if (level === 2) {
      const amount = parseFloat(inputs[1]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm unshielding:\nAmount: ${amount} USDC\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 3) {
      if (inputs[2] === "2") { await clearSession(sessionId); return END("Cancelled."); }
      if (inputs[2] !== "1") return END("Invalid choice.");
      const amount = parseFloat(inputs[1]);
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        await serverUnshield(keypair, USDC_MINT, BigInt(Math.round(amount * 1_000_000)));
        await addTransaction(phoneNumber, "unshield", amount);
        await clearSession(sessionId);
        return END(`Unshielding successful! ✓\n${amount} USDC moved to public wallet.`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Unshielding failed: ${e?.message ?? "unknown error"}`);
      }
    }
  }

  if (choice === "6") {
    const wallet = await getWalletData(phoneNumber);
    const card = wallet?.card;
    if (level === 1) {
      if (!card) return END("No card linked.\nVisit ghostfi.app/card to issue your card.");
      const { balance } = await getCardBalance(card.cardId);
      return CON(`My GhostFi Card\n\nCard: **** **** **** ${card.last4}\nBalance: $${balance.toFixed(2)} USDC\nStatus: ${card.status === "frozen" ? "Frozen" : "Active"}\n\n1. Top up card\n2. Freeze/Unfreeze card\n3. View card details (SMS)\n4. Back`);
    }
    if (level === 2) {
      if (inputs[1] === "4") { await clearSession(sessionId); return CON(MAIN_MENU); }
      if (!card) return END("No card found.");
      if (inputs[1] === "1") return CON("Enter top-up amount (USDC):");
      if (inputs[1] === "2") {
        const isFrozen = card.status === "frozen";
        if (isFrozen) await unfreezeCard(card.cardId); else await freezeCard(card.cardId);
        await updateCard(phoneNumber, { ...card, status: isFrozen ? "active" : "frozen" });
        await clearSession(sessionId);
        return END(`Card ${isFrozen ? "unfrozen ✓" : "frozen ✓"}`);
      }
      if (inputs[1] === "3") {
        const details = await getCardDetails(card.cardId);
        await sendSms(phoneNumber, `GhostFi Card Details\nNumber: ${details.cardNumber}\nCVV: ${details.cvv}\nExpiry: ${details.expiry}\n\nDelete this SMS after noting your details.`);
        await clearSession(sessionId);
        return END("Card details sent to your phone via SMS.\nDelete the SMS after noting your details.");
      }
    }
    if (level === 3 && inputs[1] === "1") {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0 || !card) return END("Invalid amount.");
      await topUpCard(card.cardId, amount);
      await addTransaction(phoneNumber, "card_topup", amount);
      await clearSession(sessionId);
      return END(`Card topped up with $${amount} USDC ✓`);
    }
  }

  if (choice === "7") {
    const wallet = await getWalletData(phoneNumber);
    await clearSession(sessionId);
    return END(`Recent Transactions:\n${formatTxHistory(wallet)}`);
  }

  await clearSession(sessionId);
  return END("Invalid option. Please dial again.");
}
