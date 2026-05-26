import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Waitlist } from "@/lib/waitlist-model";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const [total, entries, byCountry, bySource, byDay] = await Promise.all([
    Waitlist.countDocuments(),
    Waitlist.find().sort({ position: 1 }).select("-ipHash").lean(),
    Waitlist.aggregate([{ $group: { _id: "$country", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Waitlist.aggregate([{ $group: { _id: "$referralSource", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Waitlist.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);

  return NextResponse.json({ total, entries, byCountry, bySource, byDay });
}
