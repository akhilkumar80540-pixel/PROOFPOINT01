import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
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
  Trash2,
  Radio,
  Sparkles
} from 'lucide-react';
import { db, auth } from '../firebase/config';

// Helper to extract standard JS timestamp
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
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    event: null,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'past' | 'archived'
  const [actionInProgress, setActionInProgress] = useState(null);
  const [copiedEventId, setCopiedEventId] = useState(null);

  // 1-Second Luxury Orange/Amber Petal Shower on Login
  useEffect(() => {
    const shouldCelebrate = sessionStorage.getItem('justLoggedIn');

    if (shouldCelebrate) {
      sessionStorage.removeItem('justLoggedIn');

      const duration = 1500;
      const end = Date.now() + duration;
      const luxuryPetalColors = ['#f97316', '#fb923c', '#fdba74', '#f59e0b', '#fb7185', '#fff7ed'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 90,
          spread: 100,
          origin: { x: Math.random(), y: -0.05 },
          colors: luxuryPetalColors,
          shapes: ['circle', 'square'],
          scalar: 0.9,
          gravity: 1.1,
          drift: Math.sin(Date.now()) * 0.4,
          ticks: 200,
          zIndex: 9999,
          disableForReducedMotion: true,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, []);

useEffect(() => {
    let unsubscribeOrg = () => {};
    let unsubscribeAtt = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (!user) {
        setOrganizedEvents([]);
        setAttendedEvents([]);
        setLoading(false);
        return;
      }

      // 1. Realtime listener for Organized Events
      const orgQuery = query(
        collection(db, 'events'),
        where('organizerId', '==', user.uid)
      );

      unsubscribeOrg = onSnapshot(
        orgQuery,
        (snapshot) => {
          const orgList = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const timeA = typeof a.createdAt === 'number' ? a.createdAt : (parseTimestamp ? parseTimestamp(a.createdAt) : 0);
              const timeB = typeof b.createdAt === 'number' ? b.createdAt : (parseTimestamp ? parseTimestamp(b.createdAt) : 0);
              return timeB - timeA;
            });
          setOrganizedEvents(orgList);
        },
        (error) => console.error('Error in organized events listener:', error)
      );

      // 2. Realtime listener for Attendance History (proofs)
      const attQuery = query(
        collection(db, 'proofs'),
        where('attendeeId', '==', user.uid)
      );

      unsubscribeAtt = onSnapshot(
        attQuery,
        (snapshot) => {
          const attList = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const timeA = a.timestamp || a.createdAt || (parseTimestamp ? parseTimestamp(a.timestamp) : 0);
              const timeB = b.timestamp || b.createdAt || (parseTimestamp ? parseTimestamp(b.timestamp) : 0);
              return Number(timeB) - Number(timeA);
            });
          setAttendedEvents(attList);
          setLoading(false);
        },
        (error) => {
          console.error('Error in attendance history listener:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOrg();
      unsubscribeAtt();
    };
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
        // Fallback to clipboard
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

  const triggerDeleteModal = (event) => {
    setDeleteModalState({ isOpen: true, event });
  };

  const executePermanentDelete = async () => {
    const event = deleteModalState.event;
    if (!event) return;

    setActionInProgress(event.id);
    try {
      await deleteDoc(doc(db, 'events', event.id));
      setOrganizedEvents((prev) => prev.filter((item) => item.id !== event.id));
      setDeleteModalState({ isOpen: false, event: null });
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Error deleting event. Check Firestore permissions.");
    } finally {
      setActionInProgress(null);
    }
  };

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
        return 'No live or upcoming events found. Click "+ Create New" to set up your geofenced perimeter.';
      case 'past':
        return 'No past events found within the last 7 days.';
      case 'archived':
        return 'No archived events in vault.';
      default:
        return 'No events found.';
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* Subtle Background Glow */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[300px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[300px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Organizer Station</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your events, verify locations, and monitor tamper-proof attendance proofs.
            </p>
          </div>

          <Link
            to="/create-event"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs border border-orange-400/30 shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-1 hover:shadow-orange-500/40 active:translate-y-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        {/* Quick Action Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          
          <Link 
            to="/create-event" 
            className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.25)] flex items-center gap-4 group"
          >
            <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-xl text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-200">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">Create Event</h3>
              <p className="text-xs text-slate-400 mt-0.5">Set up geofence & rolling QR</p>
            </div>
          </Link>

          <Link 
            to="/scan-qr" 
            className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.25)] flex items-center gap-4 group"
          >
            <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-xl text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-200">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">Scan QR Code</h3>
              <p className="text-xs text-slate-400 mt-0.5">Verify attendance & get proof</p>
            </div>
          </Link>

          <Link 
            to="/verify" 
            className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.25)] flex items-center gap-4 group"
          >
            <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-xl text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">Verify Proof ID</h3>
              <p className="text-xs text-slate-400 mt-0.5">Check on-chain Merkle proof</p>
            </div>
          </Link>

        </div>

        {/* SECTION 1: Organized Events */}
        <div className="mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">My Organized Events</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage attendees, present dynamic QRs, and anchor batches on-chain.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <div className="bg-white/[0.03] border border-white/10 p-1 rounded-2xl flex items-center text-xs font-semibold backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 border ${
                    activeTab === 'live' 
                      ? 'bg-orange-500 text-white border-orange-400/40 shadow-md shadow-orange-500/30' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:-translate-y-0.5'
                  }`}
                >
                  Live & Upcoming ({liveEvents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('past')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 border ${
                    activeTab === 'past' 
                      ? 'bg-orange-500 text-white border-orange-400/40 shadow-md shadow-orange-500/30' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:-translate-y-0.5'
                  }`}
                >
                  Recent Past ({pastEvents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('archived')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 border ${
                    activeTab === 'archived' 
                      ? 'bg-orange-500 text-white border-orange-400/40 shadow-md shadow-orange-500/30' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:-translate-y-0.5'
                  }`}
                >
                  Archived ({archivedEvents.length})
                </button>
              </div>
            </div>
          </div>

          {/* Event Cards Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : currentEventsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-slate-400 text-xs">
              {getEmptyStateMessage()}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentEventsList.map((event) => (
                <div 
                  key={event.id} 
                  className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-[0_15px_35px_-10px_rgba(249,115,22,0.25)] flex flex-col justify-between"
                >
                  <div>
                    {/* Top Metadata Badges */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                        {event.eventId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] bg-white/[0.05] border border-white/10 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                          {event.radiusMeters}m radius
                        </span>
                        {event.archived ? (
                          <span className="text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-md font-semibold">
                            Archived
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md font-medium">
                            <Radio className="w-3 h-3 animate-pulse" /> Live
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors mb-1 line-clamp-1">
                      {event.name}
                    </h3>

                    {event.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    <div className="text-xs text-slate-400 space-y-1.5 mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
  <Calendar className="w-3.5 h-3.5 text-orange-400/80"/>
  <span>
    {event.startDate 
      ? `${event.startDate}${event.startTime ? ` • ${event.startTime}` : ''}`
      : event.date || 'Date not set'}
  </span>
</div>
                      {event.latitude !== undefined && event.longitude !== undefined && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-orange-400/80" />
                          <span className="font-mono text-slate-300">
                            {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
  {/* Present QR Button */}
  <Link
    to={`/event-attendance/${event.eventId || event.id}`}
    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-3 py-1.5 rounded-xl border border-orange-400/40 shadow-sm shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5"
    title="Open dynamic rolling QR for attendees"
  >
    <QrCode className="w-3.5 h-3.5" />
    <span>Present QR</span>
  </Link>

  {/* Roster Button */}
  <Link
    to={`/event-attendance/${event.eventId || event.id}`}
    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 hover:-translate-y-0.5"
  >
    <Users className="w-3.5 h-3.5 text-orange-400" />
    <span>Roster</span>
  </Link>
</div>

                    <div className="flex items-center gap-1.5">

                      
                      {activeTab !== 'archived' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleShareEvent(event)}
                            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                            title="Share Event ID & Link"
                          >
                            {copiedEventId === event.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Share</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={actionInProgress === event.id}
                            onClick={() => handleToggleArchive(event, true)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                            title="Archive event"
                          >
                            {actionInProgress === event.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5 text-slate-400" />
                                <span>Archive</span>
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
                            className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                            title="Restore to active"
                          >
                            {actionInProgress === event.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Restore</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={actionInProgress === event.id}
                            onClick={() => triggerDeleteModal(event)}
                            className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 px-2.5 py-1.5 rounded-xl border border-rose-500/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                            title="Permanently Delete Event"
                          >
                            {actionInProgress === event.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Delete</span>
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
        <div className="border-t border-white/10 pt-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">My Attendance History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Events you checked into and your verified location proofs.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : attendedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-slate-400 text-xs">
              No attendance recorded yet. Scan an event's QR code to verify your check-in.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              {attendedEvents.map((record) => (
                <div 
                  key={record.id} 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 mt-0.5">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {record.eventName || record.eventId}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400/70" />
                         {record.timestamp
  ? (typeof record.timestamp === 'number' 
      ? new Date(record.timestamp).toLocaleString() 
      : new Date(parseTimestamp ? parseTimestamp(record.timestamp) : record.timestamp).toLocaleString())
  : (record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Recorded')}
                        </span>
                        {record.distanceMeters !== undefined && (
                          <span className="font-mono text-slate-300">
                            Distance: {Math.round(record.distanceMeters)}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                 <div className="flex items-center gap-3">
  <span className="font-mono text-xs bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-lg text-slate-300">
    ID: {record.proofId || record.id?.substring(0, 8)}
  </span>

  <Link
    to={`/verify?id=${record.proofId || record.id}`}
    className="inline-flex items-center gap-1.5 text-xs bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 hover:text-white font-semibold px-3.5 py-1.5 rounded-xl border border-orange-500/30 transition-all duration-200 hover:-translate-y-0.5"
  >
    <span>View Proof</span>
    <ArrowRight className="w-3 h-3" />
  </Link>
</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModalState.isOpen}
          title="Permanently Delete Event?"
          message={`Are you sure you want to permanently delete "${deleteModalState.event?.name || 'this event'}"? This action cannot be reversed.`}
          confirmText="Delete Event"
          confirmVariant="danger"
          isLoading={actionInProgress === deleteModalState.event?.id}
          onConfirm={executePermanentDelete}
          onClose={() => setDeleteModalState({ isOpen: false, event: null })}
        />
        
      </div>
    </div>
  );
}