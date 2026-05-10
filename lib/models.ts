import mongoose from "mongoose";
import { DEMO_MODE } from "./constants";

const WalletSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  encryptedSecretKey: { type: String, required: true }, // Hex string
  isRegistered: { type: Boolean, default: false },
  transactions: [
    {
      type: { type: String, enum: ["shield", "unshield", "send", "receive", "card_topup"] },
      amount: Number,
      ts: { type: Number, default: Date.now },
      signature: String,
    },
  ],
  card: {
    cardId: String,
    last4: String,
    expiry: String,
    status: String,
  },
  createdAt: { type: Date, default: Date.now },
});

export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  phoneNumber: String,
  currentMenu: { type: String, default: "main" },
  lastInput: String,
  inputs: [String],
  updatedAt: { type: Date, default: Date.now, expires: 3600 }, // Auto-delete after 1 hour
});

export const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);

const FundingIntentSchema = new mongoose.Schema({
  intentId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  ts: { type: Number, default: Date.now, expires: 86400 }, // Auto-delete after 24 hours
});

export const FundingIntentModel = mongoose.models.FundingIntent || mongoose.model("FundingIntent", FundingIntentSchema);
