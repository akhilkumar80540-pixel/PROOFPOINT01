import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculateDistance } from '../utils/locationUtils';
import { generateSHA256 } from '../utils/hashUtils';
import { Loader2, CheckCircle, XCircle, User, Hash, MapPin, Clock } from 'lucide-react';
import { validateRollingToken } from '../utils/tokenUtils';

export default function LocationVerification() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const windowParam = searchParams.get('window');

  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Fetching event details...');
  const [verificationData, setVerificationData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // General Attendee States (Supports Roll No, Ticket ID, Badge ID)
  const [attendeeName, setAttendeeName] = useState(auth.currentUser?.displayName || '');
  const [identifier, setIdentifier] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    verifyLocationAndEvent();
  }, [eventId]);

  const verifyLocationAndEvent = async () => {
    try {
      const q = query(collection(db, "events"), where("eventId", "==", eventId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setStatus('error');
        setMessage('Event not found or invalid QR code.');
        return;
      }
      
      const event = querySnapshot.docs[0].data();

      // Validate Rolling Token Anti-Spoofing
      if (token && windowParam) {
        const isTokenValid = await validateRollingToken(eventId, token, windowParam);
        if (!isTokenValid) {
          setStatus('error');
          setMessage('This QR code link has expired. Please scan the current live QR code from the screen.');
          return;
        }
      }

      setMessage('Requesting your GPS location...');

      if (!navigator.geolocation) {
        setStatus('error');
        setMessage('Geolocation is not supported by your browser.');
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
            setMessage('Location & Time Verified Successfully!');
          } else {
            setStatus('failed');
            setMessage('Verification Check Failed');
          }
        },
        (error) => {
          setStatus('error');
          setMessage('Location permission denied. Please enable GPS permissions in your browser settings.');
        },
        { enableHighAccuracy: true }
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
      setFormError('Please provide both your Name and an Identifier (e.g. Ticket ID, Roll No, Badge ID).');
      return;
    }

    setIsGenerating(true);
    try {
      const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

      // 1. One-Submission Enforcement Check (by Identifier within this event)
      const duplicateQuery = query(
        collection(db, 'proofs'),
        where('eventId', '==', verificationData.event.eventId),
        where('rollNumber', '==', trimmedId)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        setFormError(`Attendance has already been recorded for Identifier: ${trimmedId}. Multiple submissions are not permitted.`);
        setIsGenerating(false);
        return;
      }

      const proofId = 'PP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      
      // 2. Cryptographic Data String for SHA-256
      const dataToHash = `${trimmedName}|${trimmedId}|${verificationData.event.eventId}|${verificationData.userLat}|${verificationData.userLng}|${timestamp}|${verificationData.distance}`;
      const proofHash = await generateSHA256(dataToHash);

      // 3. Create Proof Object with Dual Field Support
      const proofObject = {
        proofId,
        eventId: verificationData.event.eventId,
        eventName: verificationData.event.name,
        organizerId: verificationData.event.organizerId || null,
        
        // Attendee Identity
        attendeeId: currentUserId,
        attendeeName: trimmedName,
        identifier: trimmedId,

        // Legacy compatibility fields
        studentName: trimmedName,
        rollNumber: trimmedId,

        // Geolocation & Time Data
        latitude: verificationData.userLat,
        longitude: verificationData.userLng,
        timestamp,
        distanceMeters: verificationData.distance,
        locationVerified: verificationData.isLocationValid,
        timeVerified: verificationData.isTimeValid,
        
        // Verification Proof & Blockchain Anchoring Status
        proofHash,
        blockchainTxHash: null,
        createdAt: serverTimestamp()
      };

      // 4. Save to Firestore
      await addDoc(collection(db, 'proofs'), proofObject);
      
      // 5. Navigate to Proof Receipt Page
      navigate(`/proof/${proofId}`);
      
    } catch (error) {
      console.error("Error generating proof:", error);
      setFormError("Failed to generate proof. Please check your connection and try again.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
        
        {(status === 'loading' || status === 'checking') && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{message}</h2>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Error</h2>
            <p className="text-gray-600 mb-6 text-sm">{message}</p>
            <button 
              onClick={() => navigate('/scan-qr')} 
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              Scan Again
            </button>
          </div>
        )}

        {(status === 'success' || status === 'failed') && verificationData && (
          <div className="flex flex-col items-center text-left w-full">
            <div className="flex items-center justify-center w-full mb-4">
              {status === 'success' ? (
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded-full">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              )}
            </div>
            
            <h2 className={`text-xl font-bold text-center w-full mb-6 ${status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {message}
            </h2>

            {/* Geofence & Parameter Verification Breakdown */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 w-full space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2.5">
                <span className="text-gray-500">Event Name</span>
                <span className="font-semibold text-gray-900">{verificationData.event.name}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-200 pb-2.5">
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

            {/* Attendee Data Capture Form */}
            {status === 'success' && (
              <form onSubmit={handleGenerateProof} className="w-full space-y-4">
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Confirm Attendee Details</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Your details will be cryptographically bound into an immutable attendance record.
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
                        Attendee Identifier (Ticket, Roll #, or Badge ID)
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. TKT-9021, ROLL-102, or EMP-44"
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