import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
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

export default function App() {
  return (
    <DataProvider>
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-slate-100">
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profit/job-groups" element={<JobGroups />} />
              <Route path="/profit/jobs" element={<Jobs />} />
              <Route path="/profit/jobs/:id" element={<JobDetail />} />
              <Route path="/profit/profitability" element={<Profitability />} />
              <Route path="/master/vehicles" element={<Vehicles />} />
              <Route path="/master/vehicles/:id" element={<VehicleDetail />} />
              <Route path="/master/customers" element={<Customers />} />
              <Route path="/master/customers/:id" element={<CustomerDetail />} />
              <Route path="/master/drivers" element={<Drivers />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
    </DataProvider>
  );
}
