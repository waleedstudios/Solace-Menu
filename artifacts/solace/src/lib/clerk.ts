import { useClerk } from "@clerk/react";

/**
 * Sign-in is hosted by the Replit deployment. On Lovable preview hosts (and localhost)
 * there is no sign-in service unless a publishable key is configured, so the app runs
 * signed-out instead of crashing.
 */
const previewHost = /(^localhost$|^127\.0\.0\.1$|lovable\.app$|lovableproject\.com$|lovable\.dev$)/;
export const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) || !previewHost.test(window.location.hostname);

type SignOut = (opts?: { redirectUrl?: string }) => Promise<void>;
const noopSignOut: SignOut = async () => {};

/** Safe sign-out hook; `clerkEnabled` is a constant so hook order never changes. */
export const useSignOut: () => SignOut = clerkEnabled
  ? () => useClerk().signOut as SignOut
  : () => noopSignOut;
