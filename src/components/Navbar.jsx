import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to={currentUser ? "/dashboard" : "/"} className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          <span className="font-bold text-xl text-gray-900 tracking-tight">ProofPoint</span>
        </Link>
        
        <div className="flex gap-4 items-center">
          {currentUser ? (
            <>
              <Link to="/dashboard" className="text-sm font-semibold text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link to="/verify-proof" className="text-sm font-semibold text-gray-600 hover:text-gray-900">Verify Proof</Link>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg">
              Organizer Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}