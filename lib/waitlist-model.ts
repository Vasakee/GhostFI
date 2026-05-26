import mongoose from "mongoose";
import crypto from "crypto";

const WaitlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  country: { type: String, required: true },
  referralSource: { type: String, default: "" },
  position: { type: Number, required: true },
  ipHash: { type: String, default: "" },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: "" },
  referralCount: { type: Number, default: 0 },
  converted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Waitlist =
  mongoose.models.Waitlist || mongoose.model("Waitlist", WaitlistSchema);

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex");
}
