import { randomUUID } from "crypto";
import dbConnect from "./mongodb";
import { FundingIntentModel } from "./models";

export async function createFundingIntent(phone: string, amount: number, asset: string = "USDC"): Promise<string> {
  await dbConnect();
  const intentId = randomUUID();
  await FundingIntentModel.create({
    intentId,
    phone,
    amount,
    asset,
  });
  return intentId;
}

export async function getFundingIntent(intentId: string) {
  await dbConnect();
  return await FundingIntentModel.findOne({ intentId });
}

export async function removeFundingIntent(intentId: string) {
  await dbConnect();
  await FundingIntentModel.deleteOne({ intentId });
}
