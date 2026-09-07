import { useEffect, useState } from 'react';
import { QrCode, MapPin, ShieldCheck, PlusCircle, Users, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ProofPoint</h1>
      <p className="text-gray-600 mb-8">Manage events, track live verified attendance, and anchor proofs.</p>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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

        <Link to="/create-event" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center group">
          <div className="bg-purple-50 p-4 rounded-full mb-4 group-hover:bg-purple-100 transition-colors">
            <MapPin className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Active Geofences</h3>
          <p className="text-sm text-gray-500">Monitor live event perimeters</p>
        </Link>
      </div>

      {/* Organizer Events Section */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Organized Events</h2>
            <p className="text-sm text-gray-500">Click on any event to view live attendee rosters and export CSV</p>
          </div>
          <Link 
            to="/create-event" 
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            + New Event
          </Link>
        </div>

        {loadingEvents ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No events created yet. Click "Create Event" above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-primary bg-indigo-50 px-2.5 py-1 rounded">
                      {event.eventId}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {event.radiusMeters}m radius
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">{event.name}</h3>
                  {event.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{event.description}</p>
                  )}

                  <div className="text-xs text-gray-500 space-y-1 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      

                      <span>
  {event?.startTime?.toDate
    ? event.startTime.toDate().toLocaleDateString()
    : event?.startTime
    ? new Date(event.startTime).toLocaleDateString()
    : 'Date not set'}
</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono">{event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    to={`/event-attendance/${event.eventId}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-indigo-800 transition-colors"
                  >
                    <Users className="w-4 h-4" /> View Attendance List
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}