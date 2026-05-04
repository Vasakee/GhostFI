import { Keypair } from "@solana/web3.js";
import dbConnect from "./mongodb";
import { Wallet } from "./models";

// In-memory cache for fast lookups
const registrationCache = new Set<string>();

export async function getOrCreateWallet(phone: string) {
  await dbConnect();
  const existing = await Wallet.findOne({ phoneNumber: phone });
  
  if (existing) {
    if (existing.isRegistered) registrationCache.add(phone);
    return { 
      isNew: false, 
      publicKey: existing.publicKey, 
      encryptedSecretKey: existing.encryptedSecretKey 
    };
  }

  const kp = Keypair.generate();
  const publicKey = kp.publicKey.toBase58();
  const encryptedSecretKey = Buffer.from(kp.secretKey).toString("hex");

  await Wallet.create({
    phoneNumber: phone,
    publicKey,
    encryptedSecretKey,
  });

  return { isNew: true, publicKey, encryptedSecretKey };
}

export function loadKeypair(phone: string, secretHex?: string): Keypair {
  if (!secretHex) throw new Error("Secret key required to load keypair");
  return Keypair.fromSecretKey(Buffer.from(secretHex, "hex"));
}

const rateLimits = new Map<string, number[]>();
export function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(phone) ?? [];
  const valid = timestamps.filter(t => now - t < 60000);
  if (valid.length >= 10) return false;
  valid.push(now);
  rateLimits.set(phone, valid);
  return true;
}

export function isRegistered(phone: string): boolean {
  return registrationCache.has(phone);
}

export async function setRegistered(phone: string) {
  await dbConnect();
  await Wallet.updateOne({ phoneNumber: phone }, { isRegistered: true });
  registrationCache.add(phone);
}

export async function addTransaction(phone: string, type: string, amount: number, signature?: string) {
  await dbConnect();
  await Wallet.updateOne(
    { phoneNumber: phone },
    { 
      $push: { 
        transactions: { 
          $each: [{ type, amount, ts: Date.now(), signature }],
          $position: 0,
          $slice: 20
        } 
      } 
    }
  );
}

export async function getWalletData(phone: string) {
  await dbConnect();
  return await Wallet.findOne({ phoneNumber: phone });
}

export async function updateCard(phone: string, card: { cardId: string; last4: string; expiry: string; status: string }) {
  await dbConnect();
  await Wallet.updateOne({ phoneNumber: phone }, { card });
}
