import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Import Layout Components
import Navbar from './components/Navbar';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import ScanQR from './pages/ScanQR';
import VerifyProof from './pages/VerifyProof';
import LocationVerification from './pages/LocationVerification';

import ProofResult from './pages/ProofResult'; 
// NEW IMPORT
import EventAttendance from './pages/EventAttendance';

function AppLayout() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/';

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="grow">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/scan-qr" element={<ScanQR />} />
          <Route path="/proof/:proofId" element={<ProofResult />} />
          {/* NEW ROUTE ADDED HERE */}
          <Route path="/verify-location/:eventId" element={<LocationVerification />} />
          <Route path="/verify" element={<VerifyProof />} />
          <Route path="/event-attendance/:eventId" element={<EventAttendance />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}