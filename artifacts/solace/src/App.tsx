import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { LocalAuthProvider, useAuth } from "./hooks/useAuth";
import { type ReactNode } from "react";
import solaceLogo from "./assets/solace-logo.png";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import MenuItems from "./pages/dashboard/MenuItems";
import RecipeEditor from "./pages/dashboard/RecipeEditor";
import Ingredients from "./pages/dashboard/Ingredients";
import Overview from "./pages/dashboard/Overview";
import Recipes from "./pages/dashboard/Recipes";
import RecipeDetail from "./pages/dashboard/RecipeDetail";
import Invoices from "./pages/dashboard/Invoices";
import InvoiceReview from "./pages/dashboard/InvoiceReview";
import Sales from "./pages/dashboard/Sales";
import Team from "./pages/dashboard/Team";
import Portions from "./pages/dashboard/Portions";
import PublicMenu from "./pages/PublicMenu";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function AuthProviders({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const relative = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl}
    routerPush={(path) => navigate(relative(path))}
    routerReplace={(path) => navigate(relative(path), { replace: true })}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    appearance={{
      options: { logoImageUrl: new URL(solaceLogo, window.location.origin).href, logoLinkUrl: basePath || "/", logoPlacement: "inside" },
      variables: {
        colorPrimary: "hsl(var(--primary))", colorForeground: "hsl(var(--foreground))",
        colorMutedForeground: "hsl(var(--muted-foreground))", colorBackground: "hsl(var(--card))",
        colorInput: "hsl(var(--background))", colorInputForeground: "hsl(var(--foreground))",
        colorDanger: "hsl(var(--destructive))", fontFamily: "Inter, sans-serif", borderRadius: "12px",
      },
      elements: {
        rootBox: "w-full", cardBox: "w-full max-w-md border border-border shadow-md-soft rounded-2xl bg-card",
        card: "bg-transparent shadow-none", footer: "bg-transparent",
        headerTitle: "text-foreground", headerSubtitle: "text-muted-foreground",
        formFieldLabel: "text-foreground", formFieldInput: "text-foreground bg-background border-input",
        footerActionText: "text-muted-foreground", footerActionLink: "text-primary",
        socialButtonsBlockButtonText: "text-foreground", dividerText: "text-muted-foreground",
      },
    }}>
    <LocalAuthProvider>{children}</LocalAuthProvider>
  </ClerkProvider>;
}

function Home() {
  const { user } = useAuth();
  return user ? <Navigate to={user.onboarding_complete ? "/dashboard" : "/onboarding"} replace /> : <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basePath || "/"}>
        <AuthProviders>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/sign-in/*" element={<Auth />} />
          <Route path="/sign-up/*" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="menu" element={<MenuItems />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/:id" element={<RecipeDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceReview />} />
            <Route path="sales" element={<Sales />} />
            <Route path="team" element={<Team />} />
            <Route path="items/:id" element={<RecipeEditor />} />
            <Route path="ingredients" element={<Ingredients />} />
            <Route path="portions" element={<Portions />} />
          </Route>
          <Route path="/r/:slug" element={<PublicMenu />} />
          <Route path="/restaurant/:slug" element={<PublicMenu />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProviders>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
