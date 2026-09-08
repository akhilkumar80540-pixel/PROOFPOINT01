import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { calculateDistance } from '../utils/locationUtils';
import { generateSHA256 } from '../utils/hashUtils';
import { Loader2, CheckCircle, XCircle, User, Hash, MapPin, Clock, LogIn, Navigation } from 'lucide-react';
import { validateRollingToken } from '../utils/tokenUtils';

export default function LocationVerification() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const windowParam = searchParams.get('window');

  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [eventData, setEventData] = useState(null);
  
  // States: 'fetching' | 'ready_to_verify' | 'locating' | 'success' | 'failed' | 'error'
  const [status, setStatus] = useState('fetching'); 
  const [message, setMessage] = useState('Loading event details...');
  const [verificationData, setVerificationData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Attendee Inputs
  const [attendeeName, setAttendeeName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
      if (user?.displayName) {
        setAttendeeName(user.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Event Data
  useEffect(() => {
    if (!authChecked || !eventId) return;

    const fetchEvent = async () => {
      try {
        const q = query(collection(db, "events"), where("eventId", "==", eventId));
        const snap = await getDocs(q);

        if (snap.empty) {
          setStatus('error');
          setMessage('Event not found or invalid event ID.');
          return;
        }

        const ev = snap.docs[0].data();
        setEventData(ev);

        // Validate Rolling Token if present
        if (token && windowParam) {
          const isTokenValid = await validateRollingToken(eventId, token, windowParam);
          if (!isTokenValid) {
            setStatus('error');
            setMessage('This QR code link has expired. Please scan the current live QR code from the screen.');
            return;
          }
        }

        setStatus('ready_to_verify');
        setMessage('Ready to verify location');
      } catch (err) {
        console.error("Error fetching event:", err);
        setStatus('error');
        setMessage('Failed to connect to database. Please check your network.');
      }
    };

    fetchEvent();
  }, [authChecked, eventId, token, windowParam]);

  // 3. User-Initiated Geolocation Verification (Avoids mobile silent blocks)
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('locating');
    setMessage('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        const distance = calculateDistance(userLat, userLng, eventData.latitude, eventData.longitude);
        const isLocationValid = distance <= eventData.radiusMeters;
        
        const now = new Date();
        const eventStart = new Date(eventData.startTime);
        const eventEnd = new Date(eventData.endTime);
        const isTimeValid = now >= eventStart && now <= eventEnd;

        setVerificationData({
          event: eventData,
          distance: Math.round(distance),
          userLat,
          userLng,
          isLocationValid,
          isTimeValid
        });

        if (isLocationValid && isTimeValid) {
          setStatus('success');
          setMessage('Location & Schedule Verified Successfully!');
        } else {
          setStatus('failed');
          setMessage('Verification Check Failed');
        }
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setStatus('error');
        if (error.code === 1) {
          setMessage('Location permission was denied. Please allow location access in your browser settings.');
        } else if (error.code === 2) {
          setMessage('GPS position unavailable. Please ensure device Location/GPS is turned ON.');
        } else {
          setMessage('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // 4. Submit Attendance
  const handleGenerateProof = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedId = identifier.trim().toUpperCase();
    const trimmedName = attendeeName.trim();

    if (!trimmedName || !trimmedId) {
      setFormError('Please enter both Name and Identifier.');
      return;
    }

    setIsGenerating(true);
    try {
      const activeUid = auth.currentUser ? auth.currentUser.uid : null;

      // Duplicate attendance prevention
      const duplicateQuery = query(
        collection(db, 'proofs'),
        where('eventId', '==', verificationData.event.eventId),
        where('rollNumber', '==', trimmedId)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        setFormError(`Attendance already recorded for ID: ${trimmedId}. Multiple submissions are not allowed.`);
        setIsGenerating(false);
        return;
      }

      const proofId = 'PP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      
      const dataToHash = `${trimmedName}|${trimmedId}|${verificationData.event.eventId}|${verificationData.userLat}|${verificationData.userLng}|${timestamp}|${verificationData.distance}`;
      const proofHash = await generateSHA256(dataToHash);

      const proofObject = {
        proofId,
        eventId: verificationData.event.eventId,
        eventName: verificationData.event.name,
        organizerId: verificationData.event.organizerId || null,
        attendeeId: activeUid,
        attendeeName: trimmedName,
        identifier: trimmedId,
        studentName: trimmedName,
        rollNumber: trimmedId,
        latitude: verificationData.userLat,
        longitude: verificationData.userLng,
        timestamp,
        distanceMeters: verificationData.distance,
        locationVerified: verificationData.isLocationValid,
        timeVerified: verificationData.isTimeValid,
        proofHash,
        blockchainTxHash: null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'proofs'), proofObject);
      navigate(`/proof/${proofId}`);
    } catch (error) {
      console.error("Proof submission error:", error);
      setFormError("Failed to save proof. Please check your internet connection.");
      setIsGenerating(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Initializing session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <div className="inline-flex p-3 bg-indigo-50 text-primary rounded-full mb-4">
          <LogIn className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-sm text-gray-600 mb-6">
          Please login so your verified attendance can be permanently linked to your profile.
        </p>
        <Link
          to={`/login?redirect=/verify-location/${eventId}${token ? `?token=${token}&window=${windowParam}` : ''}`}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
        
        {/* Loading Event Details */}
        {status === 'fetching' && (
          <div className="py-10 flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-gray-600 font-medium">{message}</p>
          </div>
        )}

        {/* Ready to Verify: User-Triggered Button */}
        {status === 'ready_to_verify' && eventData && (
          <div className="py-4 text-center">
            <div className="inline-flex p-3 bg-indigo-50 text-primary rounded-full mb-3">
              <Navigation className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{eventData.name}</h2>
            <p className="text-xs text-gray-500 mb-6">Event ID: {eventData.eventId}</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs space-y-2 mb-6 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Allowed Perimeter:</span>
                <span className="font-semibold text-gray-800">{eventData.radiusMeters} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled Time:</span>
                <span className="font-semibold text-gray-800">
                  {new Date(eventData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(eventData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestLocation}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-sm text-sm"
            >
              <MapPin className="w-4 h-4" /> Verify My GPS Location
            </button>
          </div>
        )}

        {/* Locating In-Progress */}
        {status === 'locating' && (
          <div className="py-10 flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">Verifying Location</h3>
            <p className="text-xs text-gray-500">Please accept the browser location permission if prompted...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="py-6 flex flex-col items-center">
            <XCircle className="h-14 w-14 text-red-500 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Verification Issue</h3>
            <p className="text-xs text-gray-600 mb-6 max-w-sm">{message}</p>
            <button
              onClick={() => {
                if (eventData) {
                  handleRequestLocation();
                } else {
                  navigate('/scan-qr');
                }
              }}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Check-In Success & Form */}
        {(status === 'success' || status === 'failed') && verificationData && (
          <div className="text-left w-full">
            <div className="flex justify-center mb-3">
              {status === 'success' ? (
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded-full">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              )}
            </div>

            <h2 className={`text-base font-bold text-center mb-4 ${status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {message}
            </h2>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full space-y-2 mb-6 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Event</span>
                <span className="font-semibold text-gray-900">{verificationData.event.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Distance</span>
                <span className={`font-bold ${verificationData.isLocationValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.distance}m away (Max: {verificationData.event.radiusMeters}m)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time Window</span>
                <span className={`font-bold ${verificationData.isTimeValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.isTimeValid ? 'Valid Slot ✓' : 'Expired / Not Started ✕'}
                </span>
              </div>
            </div>

            {status === 'success' && (
              <form onSubmit={handleGenerateProof} className="space-y-4 border-t pt-4">
                {formError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Identifier (Ticket # / Roll No / ID)
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. TKT-9021 or 23CS015"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 bg-primary hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isGenerating ? 'Recording Attendance...' : 'Confirm & Save Attendance'}
                </button>
              </form>
            )}

            {status === 'failed' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-center">
                You must be physically present within {verificationData.event.radiusMeters}m during the scheduled time to check in.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}