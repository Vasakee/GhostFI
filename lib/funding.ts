import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FUNDING_FILE = path.join(process.cwd(), "data", "pending-funding.json");

interface FundingIntent {
  intentId: string;
  phone: string;
  amount: number;
  ts: number;
}

function loadIntents(): Record<string, FundingIntent> {
  if (!existsSync(FUNDING_FILE)) return {};
  return JSON.parse(readFileSync(FUNDING_FILE, "utf8"));
}

function saveIntents(intents: Record<string, FundingIntent>) {
  mkdirSync(path.dirname(FUNDING_FILE), { recursive: true });
  writeFileSync(FUNDING_FILE, JSON.stringify(intents, null, 2));
}

export function createFundingIntent(phone: string, amount: number): string {
  const intents = loadIntents();
  const intentId = randomUUID();
  intents[intentId] = { intentId, phone, amount, ts: Date.now() };
  saveIntents(intents);
  return intentId;
}

export function getFundingIntent(intentId: string): FundingIntent | null {
  const intents = loadIntents();
  return intents[intentId] ?? null;
}

export function removeFundingIntent(intentId: string) {
  const intents = loadIntents();
  delete intents[intentId];
  saveIntents(intents);
}
