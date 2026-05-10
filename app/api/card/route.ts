import { NextRequest, NextResponse } from "next/server";
import { 
  issueCard, 
  getCardDetails, 
  topUpCard, 
  getCardBalance, 
  getCardTransactions, 
  freezeCard, 
  unfreezeCard 
} from "@/lib/rain";

export async function POST(req: NextRequest) {
  // SEC-003 Fix: Verify request authorization
  const authHeader = req.headers.get("Authorization");
  const INTERNAL_SECRET = process.env.GHOSTFI_AUTH_TOKEN;
  
  if (INTERNAL_SECRET && authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, ...args } = await req.json();

    switch (action) {
      case "issue":
        return NextResponse.json(await issueCard(args.userId, args.name, args.email));
      case "details":
        return NextResponse.json(await getCardDetails(args.cardId));
      case "topup":
        return NextResponse.json(await topUpCard(args.cardId, args.amount));
      case "balance":
        return NextResponse.json(await getCardBalance(args.cardId));
      case "transactions":
        return NextResponse.json(await getCardTransactions(args.cardId));
      case "freeze":
        return NextResponse.json(await freezeCard(args.cardId));
      case "unfreeze":
        return NextResponse.json(await unfreezeCard(args.cardId));
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: any) {
    console.error(`[API Card] Error executing ${req.method}:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
