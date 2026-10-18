import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoItems, type ContentItem } from "@/data/demo";

type User = { id: number; name: string; email: string };
type Workspace = { id: number; name: string; slug: string; plan: "free" | "creator_pro" | "team"; role: string };
type Bootstrap = {
  workspace: Workspace;
  brands: Array<{ id: number; name: string; platform: string; color: string }>;
  contentTypes: Array<{ id: number; name: string; icon: string }>;
  content: Array<{ id: number; title: string; description?: string; status: ContentItem["status"]; publishAt?: string | null; brandId?: number | null; contentTypeId?: number | null; ownerUserId?: number | null; priority: string }>;
  assets: Array<{ id: number; name: string; url: string; kind: string; contentItemId?: number | null }>;
  approvals: Array<{ id: number; contentItemId: number; status: string; note?: string; content: { title: string; status: string } }>;
  performance: Array<{ id: number; contentItemId: number; views: number; likes: number; comments: number; saves: number; reach: number; engagementRate: string; content: { title: string; brandId: number | null } }>;
  members: Array<{ id: number; userId: number; role: "owner" | "editor" | "contributor" | "viewer"; name: string; email: string }>;
  savedViews: Array<{ id: number; name: string; filters: Record<string, string> }>;
  fictionalDemo: boolean;
};
type AppContextType = { user: User | null; workspace: Workspace | null; data: Bootstrap | null; loading: boolean; error: string; setError: (message: string) => void; signIn: (email: string, password: string) => Promise<void>; signUp: (name: string, email: string, password: string) => Promise<void>; signOut: () => Promise<void>; refresh: () => Promise<void>; request: <T>(path: string, options?: RequestInit) => Promise<T> };
const CreatorGridContext = createContext<AppContextType | null>(null);

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", "X-CreatorGrid-Request": "1", ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload as T;
}

export function CreatorGridProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const result = await requestJson<{ user: User }>("/api/auth/me");
    setUser(result.user);
    setData(await requestJson<Bootstrap>("/api/app/bootstrap"));
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const result = await requestJson<{ user: User }>("/api/auth/me");
        if (!alive) return;
        setUser(result.user);
        const bootstrap = await requestJson<Bootstrap>("/api/app/bootstrap");
        if (alive) setData(bootstrap);
      } catch { if (alive) { setUser(null); setData(null); } }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const signIn = useCallback(async (email: string, password: string) => { setError(""); const result = await requestJson<{ user: User }>("/api/auth/sign-in", { method: "POST", body: JSON.stringify({ email, password }) }); setUser(result.user); setData(await requestJson<Bootstrap>("/api/app/bootstrap")); }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => { setError(""); const result = await requestJson<{ user: User }>("/api/auth/sign-up", { method: "POST", body: JSON.stringify({ name, email, password, consent: true }) }); setUser(result.user); setData(await requestJson<Bootstrap>("/api/app/bootstrap")); }, []);
  const signOut = useCallback(async () => { await requestJson("/api/auth/sign-out", { method: "POST" }); setUser(null); setData(null); }, []);
  const request = useCallback(<T,>(path: string, options?: RequestInit) => requestJson<T>(path, options), []);
  const value = useMemo(() => ({ user, workspace: data?.workspace ?? null, data, loading, error, setError, signIn, signUp, signOut, refresh, request }), [user, data, loading, error, signIn, signUp, signOut, refresh, request]);
  return <CreatorGridContext.Provider value={value}>{children}</CreatorGridContext.Provider>;
}
export function useCreatorGrid() { const value = useContext(CreatorGridContext); if (!value) throw new Error("CreatorGridProvider is missing"); return value; }
export type { Bootstrap, User };
export { demoItems };
