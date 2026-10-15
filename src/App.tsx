import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
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
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
