interface SessionState {
  phoneNumber: string;
  currentMenu: string;
  pendingTransfer?: { recipient?: string; amount?: string };
  lastActivity: number;
}

const sessions = new Map<string, SessionState>();
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

function pruneExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL) sessions.delete(id);
  }
}

export function getSession(sessionId: string): SessionState | undefined {
  pruneExpired();
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, state: Partial<SessionState>) {
  const existing = sessions.get(sessionId);
  sessions.set(sessionId, { ...existing, ...state, lastActivity: Date.now() } as SessionState);
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}

export function parseMenuLevel(text: string): { level: number; inputs: string[] } {
  if (!text) return { level: 0, inputs: [] };
  const inputs = text.split("*");
  return { level: inputs.length, inputs };
}

// Rate limiting reused from whatsapp-wallets pattern
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
