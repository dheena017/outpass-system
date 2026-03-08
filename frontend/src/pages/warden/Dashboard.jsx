import { Routes, Route } from 'react-router-dom';
import WardenNav from '../../components/WardenNav';
import ApprovalQueue from './ApprovalQueue';
import ActiveRoster from './ActiveRoster';
import Map from './Map';
import Analytics from './Analytics';

export default function WardenDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <WardenNav />
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        <Routes>
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/roster" element={<ActiveRoster />} />
          <Route path="/map" element={<Map />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/" element={<ApprovalQueue />} />
        </Routes>
      </main>
    </div>
  );
}
