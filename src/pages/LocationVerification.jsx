import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { calculateDistance } from '../utils/locationUtils';
import { generateSHA256 } from '../utils/hashUtils';
import { Loader2, CheckCircle, XCircle, User, Hash, MapPin, Clock, LogIn } from 'lucide-react';
import { validateRollingToken } from '../utils/tokenUtils';

export default function LocationVerification() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const windowParam = searchParams.get('window');

  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Checking authentication & event details...');
  const [verificationData, setVerificationData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Attendee Inputs
  const [attendeeName, setAttendeeName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Safe Auth State Verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
      if (user && user.displayName) {
        setAttendeeName(user.displayName);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Trigger verification only after auth check finishes
  useEffect(() => {
    if (!authChecked) return;
    verifyLocationAndEvent();
  }, [authChecked, eventId]);

  const verifyLocationAndEvent = async () => {
    try {
      setMessage('Fetching event parameters...');
      const q = query(collection(db, "events"), where("eventId", "==", eventId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setStatus('error');
        setMessage('Event not found or invalid event ID.');
        return;
      }
      
      const event = querySnapshot.docs[0].data();

      // Rolling token check (only if present in URL from live QR)
      if (token && windowParam) {
        const isTokenValid = await validateRollingToken(eventId, token, windowParam);
        if (!isTokenValid) {
          setStatus('error');
          setMessage('This QR code link has expired. Please scan the current live QR code from the organizer screen.');
          return;
        }
      }

      setMessage('Acquiring high-accuracy GPS coordinates...');

      if (!navigator.geolocation) {
        setStatus('error');
        setMessage('Geolocation is not supported by your mobile browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          const distance = calculateDistance(userLat, userLng, event.latitude, event.longitude);
          const isLocationValid = distance <= event.radiusMeters;
          
          const now = new Date();
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          const isTimeValid = now >= eventStart && now <= eventEnd;

          setVerificationData({
            event,
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
            setMessage('Verification Parameter Check Failed');
          }
        },
        (error) => {
          console.warn("Geolocation prompt error:", error);
          setStatus('error');
          if (error.code === 1) {
            setMessage('Location permission was denied. Please allow GPS location in your mobile browser settings and reload.');
          } else if (error.code === 2) {
            setMessage('GPS position unavailable. Please ensure your device Location/GPS is turned ON.');
          } else {
            setMessage('Location request timed out. Please refresh and try again.');
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
      
    } catch (error) {
      console.error("Verification error:", error);
      setStatus('error');
      setMessage('A network error occurred while verifying the event.');
    }
  };

  const handleGenerateProof = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedId = identifier.trim().toUpperCase();
    const trimmedName = attendeeName.trim();

    if (!trimmedName || !trimmedId) {
      setFormError('Please provide both your Name and an Identifier (Ticket, Roll No, or ID).');
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
        setFormError(`Attendance has already been recorded for Identifier: ${trimmedId}. Duplicate submissions are not allowed.`);
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
        
        // Attendee Identity (Key for Attendance History)
        attendeeId: activeUid,
        attendeeName: trimmedName,
        identifier: trimmedId,

        // Legacy compatibility
        studentName: trimmedName,
        rollNumber: trimmedId,

        // Geolocation Data
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
      console.error("Error generating proof:", error);
      setFormError("Failed to generate proof. Please check your connection and try again.");
      setIsGenerating(false);
    }
  };

  // Safe Loading Screen
  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Initializing session...</p>
      </div>
    );
  }

  // If user is not logged in on mobile
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <div className="inline-flex p-3 bg-indigo-50 text-primary rounded-full mb-4">
          <LogIn className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-sm text-gray-600 mb-6">
          You must be logged in to verify attendance so the proof can be securely linked to your dashboard.
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
        
        {(status === 'loading' || status === 'checking') && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-bold text-gray-900">{message}</h2>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <XCircle className="h-14 w-14 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Notice</h2>
            <p className="text-gray-600 mb-6 text-sm max-w-md">{message}</p>
            <button 
              onClick={() => navigate('/scan-qr')} 
              className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              Scan Again
            </button>
          </div>
        )}

        {(status === 'success' || status === 'failed') && verificationData && (
          <div className="flex flex-col items-center text-left w-full">
            <div className="flex items-center justify-center w-full mb-3">
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
            
            <h2 className={`text-lg font-bold text-center w-full mb-5 ${status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {message}
            </h2>

            {/* Verification Parameter Breakdown */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full space-y-2.5 mb-6 text-sm">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-500">Event Name</span>
                <span className="font-semibold text-gray-900">{verificationData.event.name}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> Geofence Distance
                </span>
                <span className={`font-bold ${verificationData.isLocationValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.distance}m away (Max: {verificationData.event.radiusMeters}m)
                </span>
              </div>

              <div className="flex justify-between items-center pb-0.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" /> Event Window
                </span>
                <span className={`font-bold ${verificationData.isTimeValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.isTimeValid ? 'Active Slot ✓' : 'Expired / Not Started ✕'}
                </span>
              </div>
            </div>

            {/* Attendance Submission Form */}
            {status === 'success' && (
              <form onSubmit={handleGenerateProof} className="w-full space-y-4">
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Confirm Attendee Details</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Your attendance record will be tied directly to your account.
                  </p>
                  
                  {formError && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={attendeeName}
                          onChange={(e) => setAttendeeName(e.target.value)}
                          placeholder="e.g. Alex Johnson"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Attendee Identifier (Ticket, Roll #, or ID)
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. TKT-9021 or 23CS015"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isGenerating}
                  className="mt-6 flex justify-center items-center w-full py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Cryptographic Proof...
                    </>
                  ) : (
                    'Generate & Confirm Attendance'
                  )}
                </button>
              </form>
            )}

            {status === 'failed' && (
              <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg text-center w-full">
                <p className="text-sm text-red-700 font-medium">
                  Attendance cannot be recorded. You must be inside the designated {verificationData.event.radiusMeters}m geofence during the scheduled event time.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}