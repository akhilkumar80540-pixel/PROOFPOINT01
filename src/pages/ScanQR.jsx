import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  LocateFixed,
  Sparkles,Download
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Calculate exact distance in meters between attendee and event
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ScanQr() {
  const navigate = useNavigate();
  const [scannerActive, setScannerActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [verifiedProof, setVerifiedProof] = useState(null);
  const [error, setError] = useState(null);

  const scannerRef = useRef(null);
  const passCardRef = useRef(null);
const [downloading, setDownloading] = useState(false);
const [manualEventId, setManualEventId] = useState('');
// --- NAYE STATES FLOW KE LIYE ---
  const [scanStep, setScanStep] = useState('scanning'); // 'scanning', 'failed', 'info_form'
  const [verificationDetails, setVerificationDetails] = useState(null);
  
  // Attendee Info ke liye
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeIdNum, setAttendeeIdNum] = useState('');

const handleDownloadPass = async () => {
  if (!passCardRef.current) return;
  setDownloading(true);
  try {
    const dataUrl = await toPng(passCardRef.current, { cacheBust: true });
    const link = document.createElement('a');
    link.download = `ProofPoint_Pass_${verifiedProof.proofId || 'attendance'}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to download pass:', err);
    alert('Pass download failed. Please take a screenshot instead.');
  } finally {
    setDownloading(false);
  }
};

  // 1. Fetch attendee GPS location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatusMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser. Location verification is mandatory.'
      });
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGpsLoading(false);
      },
      (err) => {
        setStatusMessage({
          type: 'error',
          text: `GPS Access Denied: ${err.message}. Please enable location to scan.`
        });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 2. Initialize Camera Scanner
  const startScanner = async () => {
    setStatusMessage({ type: '', text: '' });
    setScannerActive(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => {}
      );
    } catch (err) {
      console.error('Camera startup error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to access camera. Please allow camera permissions.'
      });
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Cleanup camera on unmount
 // 1. Debugging ke liye scan string print karein
   

  // 3. Handle Scanned QR payload
 // --- FUNCTION 1: THE CORE ENGINE (Manual & Camera dono isko use karenge) ---
 const processVerification = async (targetEventId) => {
    try {
      if (!targetEventId) throw new Error('Valid Event ID is missing.');
      setSubmitting(true);
      setError(null);

      // 1. Fetch Event
      const qEvent = query(collection(db, 'events'), where('eventId', '==', targetEventId));
      const qSnap = await getDocs(qEvent);

      if (qSnap.empty) {
        throw new Error('Event not found or has been removed from database.');
      }

      const evData = qSnap.docs[0].data();
      const now = Date.now();
      if (evData.endTime && now > evData.endTime) {
        throw new Error('Event window has closed / Event has expired.');
      }
      if (evData.startTime && now < evData.startTime) {
        throw new Error('Event check-in has not started yet.');
      }
      const eventLat = evData.lat ?? evData.latitude;
      const eventLng = evData.lng ?? evData.longitude;
      const allowedRadius = Number(evData.radius ?? evData.radiusMeters ?? 100);
      const eventName = evData.eventName || targetEventId;

      if (eventLat === undefined || eventLng === undefined) {
        throw new Error('Event location coordinates are missing in the database.');
      }

      if (!userCoords) {
        throw new Error('Your GPS location is not detected. Please enable GPS.');
      }

      // 2. Geofence Check
      const distance = calculateDistance(userCoords.lat, userCoords.lng, eventLat, eventLng);
      const isDistanceValid = distance <= allowedRadius;

      // 3. Duplicate Check
      const currentUserId = auth.currentUser?.uid || 'anonymous_user';
      const qDup = query(
        collection(db, 'proofs'),
        where('eventId', '==', targetEventId),
        where('userId', '==', currentUserId)
      );
      const duplicateSnap = await getDocs(qDup);
      
      if (!duplicateSnap.empty) {
        throw new Error('Your attendance is already recorded for this event.');
      }

      if (!isDistanceValid) {
        // Agar distance fail ho gaya, toh Failure screen ka data set karein
        setVerificationDetails({
          eventName: eventName,
          distance: Math.round(distance),
          maxDistance: allowedRadius,
          failReason: `You must be physically present within ${allowedRadius}m to check in.`
        });
        setScanStep('failed');
        setSubmitting(false);
        return;
      }

      // AGAR SAB KUCH PASS HO GAYA -> Info Form par bhejein
      setVerificationDetails({
        eventId: targetEventId,
        eventName: eventName,
        distance: distance,
        lat: userCoords.lat,
        lng: userCoords.lng
      });
      setScanStep('info_form');

    } catch (err) {
      console.error('Verification Error:', err);
      // General error failure screen
      setVerificationDetails({
        eventName: targetEventId,
        distance: 'N/A',
        maxDistance: 'N/A',
        failReason: err.message || 'Verification Failed.'
      });
      setScanStep('failed');
    } finally {
      setSubmitting(false);
    }
  };
const submitFinalAttendance = async () => {
    if (!attendeeName.trim() || !attendeeIdNum.trim()) return;
    setSubmitting(true);
    
    try {
      const currentUserId = auth.currentUser?.uid || 'anonymous_user';
      const proofId = `PRF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      await addDoc(collection(db, 'proofs'), {
        proofId,
        eventId: verificationDetails.eventId,
        eventName: verificationDetails.eventName,
        userId: currentUserId,
        attendeeName: attendeeName.trim(),
        attendeeId: attendeeIdNum.trim(),
        timestamp: Date.now(),
        createdAt: Date.now(),
        distanceMeters: verificationDetails.distance,
        attendeeLat: verificationDetails.lat,
        attendeeLng: verificationDetails.lng,
        verified: true,
      });

      // Navigate to Proof page (Wahan download ka option denge)
      navigate(`/verify?id=${proofId}`);
    } catch (err) {
      setError('Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };
  // --- FUNCTION 2: SCANNER HANDLER (Sirf QR decode karke Engine ko dega) ---
  const onScanSuccess = async (decodedText) => {
    try {
      await stopScanner();
      
      let targetEventId = null;
      const cleanText = decodedText.trim();

      // Decode logic (Base64 ya direct text)
      try {
        const decodedString = atob(cleanText);
        const parsedData = JSON.parse(decodedString);
        targetEventId = parsedData?.eventId || parsedData?.id;
      } catch (e) {
        try {
          const parsedData = JSON.parse(cleanText);
          targetEventId = parsedData?.eventId || parsedData?.id;
        } catch (err) {
          // Fallback: Agar kisi ne URL ya raw text scan kiya hai
          targetEventId = cleanText;
        }
      }

      // Scanner ne ID nikal li, ab core engine ko pass kar do
      await processVerification(targetEventId);

    } catch (err) {
      setError('Failed to read QR Code. Try Manual ID.');
    }
  };
  return (
    <div className="min-h-screen w-full bg-[#08080a] text-slate-100 selection:bg-orange-500 selection:text-white p-4 sm:p-8">
      {/* Ambient background glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative max-w-xl mx-auto">
        
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs font-semibold mb-6 transition-all duration-200 hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Verification Success View (Legacy/Fallback) */}
        {verifiedProof ? (
          <div className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-emerald-500/30 p-8 text-center shadow-[0_25px_60px_-15px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Location & Proof Confirmed</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Check-in Verified!</h2>
            <p className="text-xs text-slate-400 mb-6">
              Your physical presence within the geofenced perimeter has been recorded.
            </p>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 mb-6 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Proof ID:</span>
                <span className="text-orange-400 font-bold">{verifiedProof.proofId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Event ID:</span>
                <span className="text-slate-200">{verifiedProof.eventId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proximity:</span>
                <span className="text-emerald-400 font-bold">{Math.round(verifiedProof.distanceMeters)}m from center</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs border border-orange-400/40 shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* --- SCENARIO 1: FAILURE SCREEN --- */}
            {scanStep === 'failed' && (
              <div className="bg-white rounded-3xl p-6 shadow-xl text-gray-800">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-red-600 text-center mb-6">Verification Check Failed</h2>
                
                <div className="border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Event</span>
                    <span className="font-medium">{verificationDetails?.eventName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Distance</span>
                    <span className="font-medium text-red-500">
                      {verificationDetails?.distance}m away (Max: {verificationDetails?.maxDistance}m)
                    </span>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm text-center p-4 rounded-xl mb-6">
                  {verificationDetails?.failReason}
                </div>

                <button 
                  onClick={() => { setScanStep('scanning'); setVerificationDetails(null); }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  Scan Again
                </button>
              </div>
            )}

            {/* --- SCENARIO 2: SUCCESS - INFO FORM SCREEN --- */}
            {scanStep === 'info_form' && (
              <div className="bg-[#12121a] border border-gray-800 rounded-3xl p-6 shadow-xl text-white">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-center mb-1">Location Verified!</h2>
                <p className="text-gray-400 text-sm text-center mb-6">Enter your details to record attendance for <span className="text-white font-medium">{verificationDetails?.eventName}</span></p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                      placeholder="e.g. Aryan Kumar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Attendee ID / Roll No.</label>
                    <input 
                      type="text" 
                      value={attendeeIdNum}
                      onChange={(e) => setAttendeeIdNum(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                      placeholder="e.g. CS-2023-45"
                    />
                  </div>
                </div>

                <button 
                  onClick={submitFinalAttendance}
                  disabled={submitting || !attendeeName.trim() || !attendeeIdNum.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving Attendance...' : 'Confirm Attendance'}
                </button>
              </div>
            )}

            {/* --- SCENARIO 3: ORIGINAL SCANNER & MANUAL ENTRY --- */}
            {scanStep === 'scanning' && (
              <div className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]">
                
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Geofence Attendance Verification</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Scan Event QR</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Point camera at the organizer's rolling QR code while inside the venue.
                  </p>
                </div>

                {/* GPS Signal Status Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 text-xs">
                  <div className="flex items-center gap-2.5">
                    <LocateFixed className={`w-4 h-4 ${userCoords ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                    <div>
                      <div className="font-semibold text-white">
                        {gpsLoading ? 'Acquiring GPS...' : userCoords ? 'GPS Locked & Accurate' : 'Location Not Ready'}
                      </div>
                      {userCoords && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Accurate within {Math.round(userCoords.accuracy)}m
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    userCoords 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {userCoords ? 'READY' : 'FETCHING'}
                  </span>
                </div>

                {/* Status & Error Banner */}
                {statusMessage?.text && (
                  <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                {/* Camera Viewfinder Area */}
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 mb-6 flex flex-col items-center justify-center min-h-[300px]">
                  <div id="qr-reader" className="w-full h-full" />

                  {!scannerActive && !submitting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0d0d12]/90">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                        <Camera className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">Camera Inactive</h3>
                      <p className="text-xs text-slate-400 max-w-xs mb-5">
                        Launch camera to scan the dynamic rolling QR projected on the screen.
                      </p>
                      <button
                        type="button"
                        onClick={startScanner}
                        disabled={gpsLoading || !userCoords}
                        className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs border border-orange-400/40 shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        Open Live Camera
                      </button>
                    </div>
                  )}

                  {submitting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#08080a]/90 backdrop-blur-sm z-20">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                      <span className="text-xs font-semibold text-slate-200">Verifying Geofence Proximity...</span>
                    </div>
                  )}
                </div>

                {/* Manual Entry */}
                <div className="mt-8 border-t border-gray-700/50 pt-6">
                  <p className="text-sm text-gray-400 mb-4 text-center font-mono">
                    VERIFY BY EVENT-ID  
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. EVT-12345"
                      value={manualEventId}
                      onChange={(e) => setManualEventId(e.target.value)}
                      className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (manualEventId.trim()) {
                          processVerification(manualEventId.trim());
                        }
                      }}
                      disabled={submitting || !manualEventId.trim()}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                      {submitting ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* Stop Scanner Control */}
                {scannerActive && (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="w-full mt-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-semibold transition-all hover:-translate-y-0.5"
                  >
                    Close Camera
                  </button>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );}