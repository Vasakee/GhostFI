import { Keypair } from "@solana/web3.js";
import crypto from "crypto";
import dbConnect from "./mongodb";
import { Wallet } from "./models";

const ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY || "0".repeat(64); // 32 bytes hex
const ALGO = "aes-256-gcm";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encrypted] = cipherText.split(":");
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(ENCRYPTION_KEY, "hex"), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// In-memory cache for fast lookups
const registrationCache = new Set<string>();

export async function getOrCreateWallet(phone: string) {
  await dbConnect();
  const existing = await Wallet.findOne({ phoneNumber: phone });
  
  if (existing) {
    if (existing.isRegistered) registrationCache.add(phone);
    // Auto-detect if key is encrypted (contains colons) or legacy hex
    const rawSecret = existing.encryptedSecretKey.includes(":") 
      ? decrypt(existing.encryptedSecretKey) 
      : existing.encryptedSecretKey;

    return { 
      isNew: false, 
      publicKey: existing.publicKey, 
      encryptedSecretKey: rawSecret 
    };
  }

  const kp = Keypair.generate();
  const publicKey = kp.publicKey.toBase58();
  const secretHex = Buffer.from(kp.secretKey).toString("hex");
  const secureSecret = encrypt(secretHex);

  await Wallet.create({
    phoneNumber: phone,
    publicKey,
    encryptedSecretKey: secureSecret,
  });

  return { isNew: true, publicKey, encryptedSecretKey: secretHex };
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
