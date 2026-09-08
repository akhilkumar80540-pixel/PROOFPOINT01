import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';
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
  RotateCcw,
  Share2,
  Check,
  Trash2
} from 'lucide-react';
import { db, auth } from '../firebase/config';

// Robust helper to extract standard JS timestamp
const parseTimestamp = (val) => {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  const parsed = new Date(val).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Safe event end-time parser
const getEventEndTime = (event) => {
  if (event.endTimestamp) return parseTimestamp(event.endTimestamp);
  if (event.date) {
    const timePart = event.endTime ? `T${event.endTime}` : 'T23:59:59';
    const parsed = new Date(`${event.date}${timePart}`).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return parseTimestamp(event.startTime || event.createdAt);
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'past' | 'archived'
  const [actionInProgress, setActionInProgress] = useState(null);
  const [copiedEventId, setCopiedEventId] = useState(null);

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
        const [orgSnapshot, attSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'events'), where('organizerId', '==', user.uid))),
          getDocs(query(collection(db, 'proofs'), where('attendeeId', '==', user.uid)))
        ]);

        const orgList = orgSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt));

        const attList = attSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));

        setOrganizedEvents(orgList);
        setAttendedEvents(attList);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleShareEvent = async (event) => {
    const shareUrl = `${window.location.origin}/scan-qr`;
    const shareText = `📍 Check into "${event.name}" on ProofPoint!\nEvent ID: ${event.eventId}\nMark Attendance: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `ProofPoint: ${event.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Continue to fallback clipboard copy if dismissed or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleToggleArchive = async (event, shouldArchive) => {
    const actionLabel = shouldArchive ? 'archive' : 'restore';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${event.name}"?`)) return;

    setActionInProgress(event.id);
    try {
      await updateDoc(doc(db, 'events', event.id), {
        archived: shouldArchive,
        archivedAt: shouldArchive ? new Date().toISOString() : null
      });

      setOrganizedEvents((prev) =>
        prev.map((item) => (item.id === event.id ? { ...item, archived: shouldArchive } : item))
      );
    } catch (err) {
      console.error(`Failed to ${actionLabel} event:`, err);
      alert(`Could not ${actionLabel} event. Please try again.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePermanentDelete = async (event) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING:\n\nDelete "${event.name}"? This cannot be undone.`)) {
      return;
    }

    setActionInProgress(event.id);
    try {
      await deleteDoc(doc(db, 'events', event.id));
      setOrganizedEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Could not delete event. Please check permissions.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Memoized 3-way event separation
  const { liveEvents, pastEvents, archivedEvents } = useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;

    const live = [];
    const past = [];
    const archived = [];

    organizedEvents.forEach((event) => {
      const endMs = getEventEndTime(event);

      if (event.archived || endMs < sevenDaysAgoMs) {
        archived.push(event);
      } else if (endMs >= nowMs) {
        live.push(event);
      } else {
        past.push(event);
      }
    });

    return { liveEvents: live, pastEvents: past, archivedEvents: archived };
  }, [organizedEvents]);

  const currentEventsList = useMemo(() => {
    if (activeTab === 'live') return liveEvents;
    if (activeTab === 'past') return pastEvents;
    return archivedEvents;
  }, [activeTab, liveEvents, pastEvents, archivedEvents]);

  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'live':
        return 'No live or upcoming events found. Click "Create Event" to get started.';
      case 'past':
        return 'No past events found within the last 7 days.';
      case 'archived':
        return 'No archived events found.';
      default:
        return 'No events found.';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}
        </h1>
        <p className="text-gray-600">Manage your events, verify locations, and review verified attendance proofs.</p>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Link 
          to="/create-event" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="bg-indigo-50 p-4 rounded-xl group-hover:bg-indigo-100 transition-colors">
            <PlusCircle className="h-7 w-7 text-indigo-600" />
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

      {/* SECTION 1: Organized Events */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Organized Events</h2>
            <p className="text-sm text-gray-500">Manage attendees, present dynamic QRs, and anchor batches on-chain.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'live' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Live & Upcoming ({liveEvents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'past' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Past ({pastEvents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'archived' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Archived ({archivedEvents.length})
              </button>
            </div>

            <Link 
              to="/create-event" 
              className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1"
            >
              + Create New
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : currentEventsList.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            {getEmptyStateMessage()}
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
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
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
                        {event.startTime
                          ? new Date(parseTimestamp(event.startTime)).toLocaleDateString()
                          : event.date || 'Date not set'}
                      </span>
                    </div>
                    {event.latitude !== undefined && event.longitude !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono">{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/event-attendance/${event.eventId || event.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Manage Roster
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {activeTab !== 'archived' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleShareEvent(event)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                          title="Share Event ID & Link"
                        >
                          {copiedEventId === event.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-600 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 text-gray-500" />
                              <span>Share</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={actionInProgress === event.id}
                          onClick={() => handleToggleArchive(event, true)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                          title="Archive event"
                        >
                          {actionInProgress === event.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5 text-gray-400" /> Archive
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={actionInProgress === event.id}
                          onClick={() => handleToggleArchive(event, false)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                          title="Restore to active"
                        >
                          {actionInProgress === event.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-green-600" /> Restore
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={actionInProgress === event.id}
                          onClick={() => handlePermanentDelete(event)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition"
                          title="Permanently Delete Event"
                        >
                          {actionInProgress === event.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Attended Events */}
      <div className="border-t border-gray-200 pt-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Attendance History</h2>
          <p className="text-sm text-gray-500">Events you checked into and your verified location proofs.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
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
                        {record.timestamp
                          ? new Date(parseTimestamp(record.timestamp)).toLocaleString()
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
                    className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1.5 rounded hover:bg-indigo-100 transition"
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