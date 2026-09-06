import { QrCode, MapPin, ShieldCheck, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ProofPoint</h1>
      <p className="text-gray-600 mb-8">Select an action below to get started with location verification.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/create-event" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center group">
          <div className="bg-indigo-50 p-4 rounded-full mb-4 group-hover:bg-indigo-100 transition-colors">
            <PlusCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Event</h3>
          <p className="text-sm text-gray-500">Organize a verifiable location event</p>
        </Link>

        <Link to="/scan-qr" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center group">
          <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
            <QrCode className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Scan QR</h3>
          <p className="text-sm text-gray-500">Check-in and prove your location</p>
        </Link>

        <Link to="/verify" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center group">
          <div className="bg-green-50 p-4 rounded-full mb-4 group-hover:bg-green-100 transition-colors">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Verify Proof</h3>
          <p className="text-sm text-gray-500">Validate an existing location proof</p>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center group cursor-pointer">
          <div className="bg-purple-50 p-4 rounded-full mb-4 group-hover:bg-purple-100 transition-colors">
            <MapPin className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">My Proofs</h3>
          <p className="text-sm text-gray-500">View your generated location proofs</p>
        </div>
      </div>
    </div>
  );
}