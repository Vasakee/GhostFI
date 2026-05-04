import dbConnect from "./mongodb";
import { Session } from "./models";

export async function getSession(sessionId: string) {
  await dbConnect();
  const session = await Session.findOne({ sessionId });
  if (!session) return { level: 0, inputs: [] };
  return session;
}

export async function updateSession(sessionId: string, data: any) {
  await dbConnect();
  await Session.updateOne(
    { sessionId },
    { ...data, updatedAt: Date.now() },
    { upsert: true }
  );
}

export async function clearSession(sessionId: string) {
  await dbConnect();
  await Session.deleteOne({ sessionId });
}

export function parseMenuLevel(text: string) {
  if (!text || text === "") return { level: 0, inputs: [] };
  const inputs = text.split("*");
  return { level: inputs.length, inputs };
}
