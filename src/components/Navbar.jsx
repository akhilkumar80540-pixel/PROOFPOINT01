import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, QrCode, PlusCircle, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl tracking-tight text-secondary">ProofPoint</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link to="/create-event" className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
              <PlusCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Create Event</span>
            </Link>
            <Link to="/scan-qr" className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
              <QrCode className="h-4 w-4" />
              <span className="text-sm font-medium">Scan QR</span>
            </Link>
            <Link to="/verify" className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Verify Proof</span>
            </Link>
            <Link to="/" className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors ml-4">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}