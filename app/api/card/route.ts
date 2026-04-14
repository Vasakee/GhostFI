import { NextRequest, NextResponse } from "next/server";
import { issueCard, getCardDetails, topUpCard, getCardBalance, getCardTransactions, freezeCard, unfreezeCard } from "@/lib/rain";

export async function POST(req: NextRequest) {
  const { action, ...args } = await req.json();
  try {
    let result;
    switch (action) {
      case "issue":        result = await issueCard(args.userId, args.name, args.email); break;
      case "details":      result = await getCardDetails(args.cardId); break;
      case "topup":        result = await topUpCard(args.cardId, args.amount); break;
      case "balance":      result = await getCardBalance(args.cardId); break;
      case "transactions": result = await getCardTransactions(args.cardId); break;
      case "freeze":       result = await freezeCard(args.cardId); break;
      case "unfreeze":     result = await unfreezeCard(args.cardId); break;
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
