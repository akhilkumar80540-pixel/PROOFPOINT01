import { useEffect, useState } from 'react';
import { 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  PlusCircle, 
  Users, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Award, 
  Clock, 
  Archive, 
  RotateCcw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setOrganizedEvents([]);
        setAttendedEvents([]);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Events created by this specific user
        const orgQuery = query(
          collection(db, 'events'),
          where('organizerId', '==', user.uid)
        );
        const orgSnapshot = await getDocs(orgQuery);
        const orgList = orgSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

        setOrganizedEvents(orgList);

        // 2. Fetch Attendance records for this user from proofs collection
        const attQuery = query(
          collection(db, 'proofs'),
          where('attendeeId', '==', user.uid)
        );
        const attSnapshot = await getDocs(attQuery);
        const attList = attSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          });

        setAttendedEvents(attList);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Archiving / Restoring Events
  const handleToggleArchive = async (event, shouldArchive) => {
    const actionLabel = shouldArchive ? 'archive' : 'restore';
    const confirmed = window.confirm(`Are you sure you want to ${actionLabel} "${event.name}"?`);
    if (!confirmed) return;

    setActionInProgress(event.id);
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        archived: shouldArchive,
        archivedAt: shouldArchive ? new Date().toISOString() : null
      });

      // Update local state without full reload
      setOrganizedEvents((prev) =>
        prev.map((item) =>
          item.id === event.id ? { ...item, archived: shouldArchive } : item
        )
      );
    } catch (err) {
      console.error(`Failed to ${actionLabel} event:`, err);
      alert(`Could not ${actionLabel} event. Please try again.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const activeEvents = organizedEvents.filter((ev) => !ev.archived);
  const archivedEvents = organizedEvents.filter((ev) => ev.archived);
  const currentEventsList = activeTab === 'active' ? activeEvents : archivedEvents;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}
        </h1>
        <p className="text-gray-600">Manage your events, verify locations, and review verified attendance proofs.</p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Link 
          to="/create-event" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="bg-indigo-50 p-4 rounded-xl group-hover:bg-indigo-100 transition-colors">
            <PlusCircle className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Create Event</h3>
            <p className="text-xs text-gray-500">Set up geofence & rolling QR</p>
          </div>
        </Link>

        <Link 
          to="/scan-qr" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="bg-blue-50 p-4 rounded-xl group-hover:bg-blue-100 transition-colors">
            <QrCode className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Scan QR Code</h3>
            <p className="text-xs text-gray-500">Verify attendance & get proof</p>
          </div>
        </Link>

        <Link 
          to="/verify" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="bg-green-50 p-4 rounded-xl group-hover:bg-green-100 transition-colors">
            <ShieldCheck className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Verify Proof ID</h3>
            <p className="text-xs text-gray-500">Check on-chain Merkle proof</p>
          </div>
        </Link>
      </div>

      {/* SECTION 1: Events I Organized */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Organized Events</h2>
            <p className="text-sm text-gray-500">Manage attendees, present dynamic QRs, and anchor batches on-chain.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs: Active vs Archived */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'active' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Active ({activeEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'archived' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Archived ({archivedEvents.length})
              </button>
            </div>

            <Link 
              to="/create-event" 
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              + Create New
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : currentEventsList.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            {activeTab === 'active'
              ? 'No active events found. Click "Create Event" to get started.'
              : 'No archived events.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentEventsList.map((event) => (
              <div 
                key={event.id} 
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-primary bg-indigo-50 px-2.5 py-1 rounded">
                      {event.eventId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {event.radiusMeters}m radius
                      </span>
                      {event.archived && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                          Archived
                        </span>
                      )}
                    </div>
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

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/event-attendance/${event.eventId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-indigo-800 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" /> Manage Roster
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Archive / Restore Button */}
                  <button
                    type="button"
                    disabled={actionInProgress === event.id}
                    onClick={() => handleToggleArchive(event, !event.archived)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                    title={event.archived ? "Restore event to active" : "Archive event from active list"}
                  >
                    {actionInProgress === event.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    ) : event.archived ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-green-600" /> Restore
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-gray-400" /> Archive
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Events I Attended */}
      <div className="border-t border-gray-200 pt-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Attendance History</h2>
          <p className="text-sm text-gray-500">Events you checked into and your verified location proofs.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : attendedEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No attendance recorded yet. Scan an event's QR code to verify your check-in.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
            {attendedEvents.map((record) => (
              <div key={record.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-green-50 rounded-lg mt-0.5">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{record.eventName || record.eventId}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {record.timestamp?.toDate
                          ? record.timestamp.toDate().toLocaleString()
                          : record.timestamp
                          ? new Date(record.timestamp).toLocaleString()
                          : 'Recorded'}
                      </span>
                      {record.distanceMeters !== undefined && (
                        <span>Distance: {Math.round(record.distanceMeters)}m</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2.5 py-1 rounded text-gray-700">
                    ID: {record.proofId || record.id.substring(0, 8)}
                  </span>
                  <Link
                    to={`/verify?id=${record.proofId || record.id}`}
                    className="text-xs bg-indigo-50 text-primary font-semibold px-3 py-1.5 rounded hover:bg-indigo-100 transition"
                  >
                    View Proof
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