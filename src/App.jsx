import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventAttendance from './pages/EventAttendance';
import LocationVerification from './pages/LocationVerification';
import ProofResult from './pages/ProofResult';
import Login from './pages/Login';
import ScanQR from './pages/ScanQR';
import VerifyProof from './pages/VerifyProof';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Navbar />
          <main className="p-4 md:p-6 lg:p-8">
            <Routes>
              {/* 🟢 PUBLIC ROUTES */}
              <Route path="/verify-location/:eventId" element={<LocationVerification />} />
              <Route path="/proof/:proofId" element={<ProofResult />} />
              <Route path="/verify-proof" element={<VerifyProof />} />
              <Route path="/verify" element={<Navigate to="/verify-proof" replace />} />
              
              {/* 🔑 AUTH ROUTES */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Login />} />

              {/* 🔴 PROTECTED ROUTES */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/create-event" element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              } />
              
              <Route path="/event-attendance/:eventId" element={
                <ProtectedRoute>
                  <EventAttendance />
                </ProtectedRoute>
              } />

              <Route path="/scan-qr" element={
                <ProtectedRoute>
                  <ScanQR />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}