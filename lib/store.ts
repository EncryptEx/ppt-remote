export interface Session {
  id: string;
  fileName: string;
  fileType: "pdf" | "pptx";
  fileData: Buffer;
  currentSlide: number;
  totalSlides: number;
  createdAt: number;
}

// Use global to survive Next.js hot-reloads in development.
// NOTE: In production on Vercel, multiple function instances won't share this Map.
// For production use, replace with Vercel KV (@vercel/kv).
declare global {
  var __pptRemoteSessions: Map<string, Session> | undefined; // eslint-disable-line no-var
}

export const sessions: Map<string, Session> =
  global.__pptRemoteSessions ?? new Map();

if (!global.__pptRemoteSessions) {
  global.__pptRemoteSessions = sessions;
}

/** Remove sessions older than 2 hours to avoid unbounded memory growth. */
export function cleanupSessions(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (session.createdAt < cutoff) {
      sessions.delete(id);
    }
  }
}
