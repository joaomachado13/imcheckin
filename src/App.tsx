import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Rejected from "./pages/Rejected";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import BuyerDetail from "./pages/BuyerDetail";
import Search from "./pages/Search";
import UserManagement from "./pages/UserManagement";
import Volunteers from "./pages/Volunteers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/rejected" element={<Rejected />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/event/:eventId" element={<EventDetail />} />
                  <Route path="/buyer/:buyerId" element={<BuyerDetail />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/volunteers" element={<Volunteers />} />
                  <Route path="/users" element={<UserManagement />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;