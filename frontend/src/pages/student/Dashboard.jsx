import { Routes, Route } from 'react-router-dom';
import StudentNav from '../../components/StudentNav';
import RequestForm from './RequestForm';
import RequestStatus from './RequestStatus';

export default function StudentDashboard() {
  return (
    <div className="flex h-screen bg-gray-100">
      <StudentNav />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/request" element={<RequestForm />} />
          <Route path="/status" element={<RequestStatus />} />
          <Route path="/" element={<RequestStatus />} />
        </Routes>
      </main>
    </div>
  );
}
