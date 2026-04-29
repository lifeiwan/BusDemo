import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canViewSection } from './lib/permissions';
import type { Section } from './lib/permissions';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import JobGroups from './pages/JobGroups';
import Jobs from './pages/Jobs';
import Profitability from './pages/Profitability';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Drivers from './pages/Drivers';
import JobDetail from './pages/JobDetail';
import GaExpenses from './pages/GaExpenses';
import Reports from './pages/Reports';
import VehicleReport from './pages/VehicleReport';
import JobGroupReport from './pages/JobGroupReport';
import Users from './pages/Users';
import Login from './pages/Login';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, section }: { children: ReactNode; section: Section }) {
  const { user, appRole, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewSection(appRole, section)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <DataProvider>
            <div className="flex flex-col h-screen bg-slate-100">
              <TopNav />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/ops/job-groups" element={<JobGroups />} />
                    <Route path="/ops/jobs" element={<Jobs />} />
                    <Route path="/ops/jobs/:id" element={<JobDetail />} />
                    <Route path="/master/vehicles" element={<Vehicles />} />
                    <Route path="/master/vehicles/:id" element={<VehicleDetail />} />
                    <Route path="/master/customers" element={<Customers />} />
                    <Route path="/master/customers/:id" element={<CustomerDetail />} />
                    <Route path="/master/drivers" element={<Drivers />} />
                    <Route path="/master/ga-expenses" element={
                      <RoleRoute section="profit"><GaExpenses /></RoleRoute>
                    } />
                    <Route path="/profit/profitability" element={
                      <RoleRoute section="profit"><Profitability /></RoleRoute>
                    } />
                    <Route path="/reports/pl" element={
                      <RoleRoute section="reports"><Reports /></RoleRoute>
                    } />
                    <Route path="/reports/vehicle" element={
                      <RoleRoute section="reports"><VehicleReport /></RoleRoute>
                    } />
                    <Route path="/reports/job-group" element={
                      <RoleRoute section="reports"><JobGroupReport /></RoleRoute>
                    } />
                    <Route path="/admin/users" element={
                      <RoleRoute section="admin"><Users /></RoleRoute>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          </DataProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
