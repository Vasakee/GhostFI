import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWallet, loadKeypair, checkRateLimit, isRegistered, setRegistered, addTransaction, getWalletData, updateCard } from "@/lib/whatsapp-wallets";
import { getSession, updateSession, clearSession, parseMenuLevel } from "@/lib/ussd-sessions";
import { serverGetBalance, serverShield, serverUnshield, serverSend, serverRegister } from "@/lib/server-umbra";
import { getCardDetails, getCardBalance, freezeCard, unfreezeCard, topUpCard } from "@/lib/rain";
import { raenest } from "@/lib/raenest";
import { createFundingIntent } from "@/lib/funding";
import { USDC_MINT, PUSD_MINT, USDT_MINT, USDG_MINT } from "@/lib/umbra";
import { DEMO_MODE } from "@/lib/config";

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
8. Swap to PUSD
9. Withdraw to Bank
0. Exit`;

async function ensureRegistered(phone: string, secretHex: string) {
  if (isRegistered(phone)) return;
  const keypair = loadKeypair(phone, secretHex);
  await serverRegister(keypair);
  await setRegistered(phone);
}

async function getBalances(phone: string, secretHex: string): Promise<{ usdc: string; usdt: string; pusd: string; usdg: string }> {
  if (DEMO_MODE) {
    return { usdc: "1,240.50", usdt: "450.00", pusd: "5,000.00", usdg: "125.00" };
  }
  try {
    await ensureRegistered(phone, secretHex);
    const keypair = loadKeypair(phone, secretHex);
    const balances = await serverGetBalance(keypair, [USDC_MINT, USDT_MINT, PUSD_MINT, USDG_MINT]);
    
    return {
      usdc: (Number(balances.get(USDC_MINT) ?? 0n) / 1_000_000).toFixed(2),
      usdt: (Number(balances.get(USDT_MINT) ?? 0n) / 1_000_000).toFixed(2),
      pusd: (Number(balances.get(PUSD_MINT) ?? 0n) / 1_000_000).toFixed(2),
      usdg: (Number(balances.get(USDG_MINT) ?? 0n) / 1_000_000).toFixed(2)
    };
  } catch {
    return { usdc: "0.00", usdt: "0.00", pusd: "0.00", usdg: "0.00" };
  }
}

async function getUsdcBalance(phone: string, secretHex: string): Promise<string> {
  const { usdc } = await getBalances(phone, secretHex);
  return usdc;
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
  const icons: Record<string, string> = { shield: "+", unshield: "-", send: ">", receive: "<", withdraw: "B" };
  return txs.map((t: any, i: number) => {
    const ago = (() => {
      const h = Math.floor((Date.now() - t.ts) / 3_600_000);
      return h < 1 ? "now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
    })();
    return `${i + 1}. ${icons[t.type] ?? "•"} ${t.type} ${t.amount} - ${ago}`;
  }).join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const sessionId = params.get("sessionId") ?? "";
  const phoneNumber = params.get("phoneNumber") ?? "";
  const text = params.get("text") ?? "";
  const clientToken = params.get("token") || req.nextUrl.searchParams.get("token");

  if (!phoneNumber) return END("Session error. Please try again.");

  // SEC-002 Fix: Authenticate the USSD provider
  const INTERNAL_SECRET = process.env.GHOSTFI_AUTH_TOKEN;
  if (INTERNAL_SECRET && clientToken !== INTERNAL_SECRET) {
    return END("Unauthorized Access. Secure link required.");
  }

  const incomingUsername = params.get("username");
...
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
    const { usdc, usdt, pusd, usdg } = await getBalances(phoneNumber, encryptedSecretKey);
    await clearSession(sessionId);
    return END(`Your Private Balances:
USDC: ${usdc}
USDT: ${usdt}
PUSD: ${pusd} (Private)
USDG: ${usdg} (Paxos)

Encrypted on Solana.`);
  }

  if (choice === "2") {
    if (level === 1) return CON(`Send Private Transfer\n\n1. USDC\n2. USDT\n3. USDG`);
    if (level === 2) return CON(`Enter recipient phone number:\n(e.g. 2348012345678)`);
    if (level === 3) return CON(`Enter amount to send:`);
    if (level === 4) {
      const amount = parseFloat(inputs[3]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      const assetMap: Record<string, string> = { "1": "USDC", "2": "USDT", "3": "USDG" };
      return CON(`Confirm transfer:\nAsset: ${assetMap[inputs[1]] || "USDC"}\nTo: +${inputs[2]}\nAmount: ${amount}\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 5) {
      if (inputs[4] === "2") { await clearSession(sessionId); return END("Transfer cancelled."); }
      const amount = parseFloat(inputs[3]);
      const mintMap: Record<string, string> = { "1": USDC_MINT, "2": USDT_MINT, "3": USDG_MINT };
      const mint = mintMap[inputs[1]] || USDC_MINT;
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        const { publicKey: recipientAddress } = await getOrCreateWallet(inputs[2]);
        const result = await serverSend(keypair, recipientAddress, mint, BigInt(Math.round(amount * 1_000_000)));
        const signature = (result as any)?.signature ?? String(result ?? "");
        await addTransaction(phoneNumber, "send", amount, signature);
        await clearSession(sessionId);
        return END(`Transfer successful! ✓\nSent ${amount} privately.\nRef: ${signature.slice(0, 8)}`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Transfer failed: ${e?.message}`);
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
      return END(`Payment link sent! ✓\nCheck your SMS for the checkout link.`);
    }
  }

  if (choice === "4") {
    if (level === 1) return CON(`Shield Funds\n1. USDC\n2. USDT\n\nEnter choice:`);
    if (level === 2) return CON(`Enter amount to shield:`);
    if (level === 3) {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm shielding ${amount} ${inputs[1] === "1" ? "USDC" : "USDT"}?\n1. Confirm\n2. Cancel`);
    }
    if (level === 4) {
      if (inputs[3] === "2") { await clearSession(sessionId); return END("Cancelled."); }
      const amount = parseFloat(inputs[2]);
      const mint = inputs[1] === "1" ? USDC_MINT : USDT_MINT;
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        await serverShield(keypair, mint, BigInt(Math.round(amount * 1_000_000)));
        await addTransaction(phoneNumber, "shield", amount);
        await clearSession(sessionId);
        return END(`Shielding successful! ✓\nBalance is now private.`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Shielding failed: ${e?.message}`);
      }
    }
  }

  if (choice === "5") {
    if (level === 1) return CON(`Unshield Funds\n1. USDC\n2. USDT\n\nEnter choice:`);
    if (level === 2) return CON(`Enter amount to unshield:`);
    if (level === 3) {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm unshielding ${amount} ${inputs[1] === "1" ? "USDC" : "USDT"}?\n1. Confirm\n2. Cancel`);
    }
    if (level === 4) {
      if (inputs[3] === "2") { await clearSession(sessionId); return END("Cancelled."); }
      const amount = parseFloat(inputs[2]);
      const mint = inputs[1] === "1" ? USDC_MINT : USDT_MINT;
      try {
        await ensureRegistered(phoneNumber, encryptedSecretKey);
        const keypair = loadKeypair(phoneNumber, encryptedSecretKey);
        await serverUnshield(keypair, mint, BigInt(Math.round(amount * 1_000_000)));
        await addTransaction(phoneNumber, "unshield", amount);
        await clearSession(sessionId);
        return END(`Unshielding successful! ✓`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Unshielding failed: ${e?.message}`);
      }
    }
  }

  if (choice === "6") {
    const wallet = await getWalletData(phoneNumber);
    const card = wallet?.card;
    if (level === 1) {
      if (!card) return END("No card linked.\nVisit ghostfi.app/card to issue your card (Raenest).");
      const { balance } = DEMO_MODE ? { balance: 250.00 } : await getCardBalance(card.cardId);
      return CON(`My GhostFi Card\n\nCard: **** **** **** ${card.last4}\nBalance: $${balance.toFixed(2)} USD\nProvider: Raenest\n\n1. Top up card\n2. Freeze/Unfreeze\n3. Card details (SMS)\n4. Back`);
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
        await sendSms(phoneNumber, `GhostFi Card Details\nNumber: ${details.cardNumber}\nCVV: ${details.cvv}\nExpiry: ${details.expiry}\n\nDelete this SMS.`);
        await clearSession(sessionId);
        return END("Card details sent via SMS.");
      }
    }
    if (level === 3 && inputs[1] === "1") {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0 || !card) return END("Invalid amount.");
      await topUpCard(card.cardId, amount);
      await addTransaction(phoneNumber, "card_topup", amount);
      await clearSession(sessionId);
      return END(`Card topped up with $${amount} ✓`);
    }
  }

  if (choice === "7") {
    const wallet = await getWalletData(phoneNumber);
    await clearSession(sessionId);
    return END(`Recent Transactions:\n${formatTxHistory(wallet)}`);
  }

  if (choice === "8") {
    if (level === 1) return CON("Swap to Palm USD (PUSD)\n1. USDC to PUSD\n2. USDT to PUSD\n\nChoice:");
    if (level === 2) return CON(`Enter amount to swap:`);
    if (level === 3) {
      const amount = parseFloat(inputs[2]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm Swap:\n${amount} ${inputs[1] === "1" ? "USDC" : "USDT"} → PUSD\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 4) {
      if (inputs[3] === "2") { await clearSession(sessionId); return END("Swap cancelled."); }
      const amount = parseFloat(inputs[2]);
      await addTransaction(phoneNumber, "swap", amount);
      await clearSession(sessionId);
      return END(`Swap initiated! ✓\nConverted to PUSD.`);
    }
  }

  if (choice === "9") {
    if (level === 1) return CON("Withdraw to Bank\n(Africa Region)\n\nEnter Bank Code (e.g. 058):");
    if (level === 2) return CON("Enter Account Number:");
    if (level === 3) return CON("Enter amount to withdraw ($):");
    if (level === 4) {
      const amount = parseFloat(inputs[3]);
      if (isNaN(amount) || amount <= 0) return END("Invalid amount.");
      return CON(`Confirm Withdrawal:\nBank: ${inputs[1]}\nAccount: ${inputs[2]}\nAmount: $${amount}\nEst. local currency: ₦${amount * 1500}\n\n1. Confirm\n2. Cancel`);
    }
    if (level === 5) {
      if (inputs[4] === "2") { await clearSession(sessionId); return END("Cancelled."); }
      const amount = parseFloat(inputs[3]);
      try {
        const result = await raenest.payout(phoneNumber, inputs[1], inputs[2], amount * 1500);
        await addTransaction(phoneNumber, "withdraw", amount, result.reference);
        await clearSession(sessionId);
        return END(`Withdrawal initiated! ✓\nReference: ${result.reference}`);
      } catch (e: any) {
        await clearSession(sessionId);
        return END(`Withdrawal failed: ${e?.message}`);
      }
    }
  }

  await clearSession(sessionId);
  return END("Invalid option. Please dial again.");
}

