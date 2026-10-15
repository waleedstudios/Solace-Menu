import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

type User = { id: string; email: string };
type AuthState = { user: User | null; loading: boolean; error: string | null };
const AuthContext = createContext<AuthState>({ user: null, loading: true, error: null });

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });
  useEffect(() => {
    queryClient.clear();
    if (!isLoaded) return;
    if (!isSignedIn) { setState({ user: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    setState({ user: null, loading: true, error: null });
    fetch("/api/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Could not load your account.");
        setState({ user: result, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ user: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, clerkUser?.id, queryClient]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
