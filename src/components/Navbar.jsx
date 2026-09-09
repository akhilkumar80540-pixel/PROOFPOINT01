import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, ShieldCheck, User } from 'lucide-react';
import Logo from './Logo';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#09090c]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Brand Logo with Navigation Link */}
        <Link 
          to={currentUser ? "/dashboard" : "/"} 
          className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Logo size="default" />
        </Link>
        
        {/* Navigation & User Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {currentUser ? (
            <>
              {/* Dashboard Link */}
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
                  isActive('/dashboard')
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              {/* Verify Proof Link */}
              <Link 
                to="/verify-proof" 
                className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
                  isActive('/verify-proof')
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Proof</span>
              </Link>

              {/* Divider */}
              <div className="hidden sm:block h-5 w-px bg-white/10 mx-1" />

              {/* User Identity Pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs font-medium text-slate-300">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <User className="w-3 h-3" />
                </div>
                <span className="max-w-[140px] truncate text-slate-300">
                  {currentUser.email?.split('@')[0]}
                </span>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 px-3.5 py-2 rounded-xl transition-all active:scale-[0.97]"
                title="Sign out of ProofPoint"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-[0.98]"
            >
              Organizer Access
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}