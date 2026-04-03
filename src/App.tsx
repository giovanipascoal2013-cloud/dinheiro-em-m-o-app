import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ZoneDetail from "./pages/ZoneDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MyZones from "./pages/MyZones";
import Dashboard from "./pages/Dashboard";
import ZonesPage from "./pages/dashboard/Zones";
import ATMsPage from "./pages/dashboard/ATMs";
import AgentsPage from "./pages/dashboard/Agents";
import RolesPage from "./pages/dashboard/Roles";
import UsersPage from "./pages/dashboard/Users";
import SubscriptionsPage from "./pages/dashboard/Subscriptions";
import WithdrawalsPage from "./pages/dashboard/Withdrawals";
import AssignmentsPage from "./pages/dashboard/Assignments";
import AgentDashboard from "./pages/AgentDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Terms from "./pages/Terms";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/zone/:id" element={<ZoneDetail />} />
            <Route path="/my-zones" element={<MyZones />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Dashboard routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor', 'agent']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/zones" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor', 'agent']}>
                <ZonesPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/atms" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor', 'agent']}>
                <ATMsPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/assignments" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
                <AssignmentsPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/agents" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
                <AgentsPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/subscriptions" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor', 'financeiro']}>
                <SubscriptionsPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/withdrawals" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
                <WithdrawalsPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/roles" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <RolesPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/users" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/agent" element={
              <ProtectedRoute requiredRoles={['agent', 'admin', 'supervisor']}>
                <AgentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/finance" element={
              <ProtectedRoute requiredRoles={['financeiro', 'admin']}>
                <FinanceDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
