import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Wallet } from "@/lib/models";

export async function GET() {
  try {
    await dbConnect();
    
    // Aggregating real data from our database
    const wallets = await Wallet.find({});
    
    let totalVolume = 0;
    let privateTransfers = 0;
    let activeWallets = wallets.length;
    let totalPayouts = 0;

    wallets.forEach(wallet => {
      (wallet.transactions || []).forEach((tx: any) => {
        // Increment transfer count for relevant types
        if (["shield", "unshield", "send", "receive"].includes(tx.type)) {
          privateTransfers++;
          
          // Approximate volume in USD (assuming USDC/USDT 1:1 for the tracker)
          if (tx.amount) {
            totalVolume += tx.amount;
          }
        }

        if (tx.type === "withdraw") {
          totalPayouts += tx.amount;
        }
      });
    });

    // We return 100% real data from our database
    // All volumes are converted from atomic units (6 decimals) to UI units
    return NextResponse.json({
      tvl: totalVolume / 1e6,
      transfers: privateTransfers,
      wallets: activeWallets,
      payouts: totalPayouts / 1e6,
      isRealTime: true
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
