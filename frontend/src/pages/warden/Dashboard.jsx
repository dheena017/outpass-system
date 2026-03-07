import { Routes, Route } from 'react-router-dom';
import WardenNav from '../../components/WardenNav';
import ApprovalQueue from './ApprovalQueue';
import ActiveRoster from './ActiveRoster';
import Map from './Map';

export default function WardenDashboard() {
  return (
    <div className="flex h-screen bg-gray-100">
      <WardenNav />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/roster" element={<ActiveRoster />} />
          <Route path="/map" element={<Map />} />
          <Route path="/" element={<ApprovalQueue />} />
        </Routes>
      </main>
    </div>
  );
}
