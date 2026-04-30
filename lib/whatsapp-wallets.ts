import { Keypair } from "@solana/web3.js";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

// #7 — Validated at runtime (not module load) so build-time static analysis doesn't throw.
// Will throw on first request if key is missing or insecure.
function getEncKey(): Buffer {
  const raw = process.env.WALLET_ENCRYPTION_KEY;
  if (!raw || raw === "0".repeat(64)) {
    throw new Error("WALLET_ENCRYPTION_KEY is not set or is the insecure zero default. Generate one with: openssl rand -hex 32");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return key;
}

const WALLETS_FILE = path.join(process.cwd(), "data", "wallets.json");

function loadStore(): Record<string, string> {
  if (!existsSync(WALLETS_FILE)) return {};
  return JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
}

function saveStore(store: Record<string, string>) {
  mkdirSync(path.dirname(WALLETS_FILE), { recursive: true });
  writeFileSync(WALLETS_FILE, JSON.stringify(store, null, 2));
}

function phoneHash(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

function encrypt(data: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(data: string): Buffer {
  const [ivHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncKey(), iv);
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
}

// #8 — Track which wallets have been registered with Umbra on-chain
const REGISTERED_FILE = path.join(process.cwd(), "data", "registered.json");

function loadRegistered(): Set<string> {
  if (!existsSync(REGISTERED_FILE)) return new Set();
  return new Set(JSON.parse(readFileSync(REGISTERED_FILE, "utf8")));
}

function markRegistered(hash: string) {
  const set = loadRegistered();
  set.add(hash);
  mkdirSync(path.dirname(REGISTERED_FILE), { recursive: true });
  writeFileSync(REGISTERED_FILE, JSON.stringify([...set], null, 2));
}

export function isRegistered(phoneNumber: string): boolean {
  return loadRegistered().has(phoneHash(phoneNumber));
}

export function setRegistered(phoneNumber: string) {
  markRegistered(phoneHash(phoneNumber));
}

export function getOrCreateWallet(phoneNumber: string): { publicKey: string; isNew: boolean } {
  const store = loadStore();
  const key = phoneHash(phoneNumber);
  if (store[key]) {
    const kp = loadKeypair(phoneNumber);
    return { publicKey: kp.publicKey.toBase58(), isNew: false };
  }
  const kp = Keypair.generate();
  store[key] = encrypt(Buffer.from(kp.secretKey));
  saveStore(store);
  return { publicKey: kp.publicKey.toBase58(), isNew: true };
}

export function loadKeypair(phoneNumber: string): Keypair {
  const store = loadStore();
  const key = phoneHash(phoneNumber);
  if (!store[key]) throw new Error("No wallet for this phone number");
  const secretKey = decrypt(store[key]);
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

// Rate limiting: max 10 requests per phone per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phoneNumber);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phoneNumber, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}
