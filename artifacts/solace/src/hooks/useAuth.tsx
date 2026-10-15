import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { resetPrivateQueries } from "@/lib/menu-cache";

type User = {
  id: string; email: string; full_name: string | null; onboarding_complete: boolean;
  business_name: string | null; business_address: string | null; business_phone: string | null;
};
export type BusinessDetails = {
  full_name: string; email: string; business_name: string; business_address: string; business_phone: string;
};
type AuthState = { user: User | null; loading: boolean; error: string | null };
type AuthContextValue = AuthState & { completeOnboarding: (details: BusinessDetails) => Promise<void> };
const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true, error: null,
  completeOnboarding: async () => { throw new Error("Your account is not ready yet."); },
});

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });
  useEffect(() => {
    resetPrivateQueries(queryClient);
    if (!isLoaded) return;
    if (!isSignedIn) { setState({ user: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    setState({ user: null, loading: true, error: null });
    fetch("/api/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Could not load your account.");
        setState({ user: { ...result, full_name: result.full_name || clerkUser?.fullName || null }, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ user: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, clerkUser?.id, queryClient]);
  const completeOnboarding = async (details: BusinessDetails) => {
    if (!state.user) throw new Error("Please sign in before setting up your business.");
    const response = await fetch("/api/onboarding", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not save your business details.");
    resetPrivateQueries(queryClient);
    setState({ user: result, loading: false, error: null });
  };
  return <AuthContext.Provider value={{ ...state, completeOnboarding }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
