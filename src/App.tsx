import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthTest from "./pages/AuthTest.tsx";
import SignIn from "./pages/SignIn.tsx";
import DashboardCompare from "./pages/DashboardCompare.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { RequireAuth } from "./components/RequireAuth";
import { BusinessGate } from "./components/BusinessGate";
import Join from "./pages/Join.tsx";
import AdminBusinesses from "./pages/AdminBusinesses.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <BusinessGate>
                    <Index />
                  </BusinessGate>
                </RequireAuth>
              }
            />
            <Route path="/join" element={<Join />} />
            <Route
              path="/admin/businesses"
              element={
                <RequireAuth>
                  <AdminBusinesses />
                </RequireAuth>
              }
            />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="/dashboard-compare" element={<DashboardCompare />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
