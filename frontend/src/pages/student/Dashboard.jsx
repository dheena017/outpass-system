import { Routes, Route } from 'react-router-dom';
import StudentNav from '../../components/StudentNav';
import RequestForm from './RequestForm';
import RequestStatus from './RequestStatus';

export default function StudentDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <StudentNav />
      {/* pt-14 on mobile for top bar, pb-16 for bottom tab bar */}
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        <Routes>
          <Route path="/request" element={<RequestForm />} />
          <Route path="/status" element={<RequestStatus />} />
          <Route path="/" element={<RequestStatus />} />
        </Routes>
      </main>
    </div>
  );
}
