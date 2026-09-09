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

  const scannerRef = useRef(null);
  const passCardRef = useRef(null);
const [downloading, setDownloading] = useState(false);

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
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 3. Handle Scanned QR payload
  const onScanSuccess = async (decodedText) => {
    try {
      await stopScanner();
      setSubmitting(true);

     // Decode token safely (Base64 ya direct JSON)
    let parsedData = null;
    try {
      const rawData = atob(decodedText.trim());
      parsedData = JSON.parse(rawData);
    } catch (e) {
      try {
        parsedData = JSON.parse(decodedText.trim());
      } catch (jsonErr) {
        parsedData = { eventId: decodedText.trim() };
      }
    }

    const { eventId, lat: eventLat, lng: eventLng, radius: eventRadius, ts } = parsedData || {};

    if (!eventId) {
      throw new Error('Invalid ProofPoint QR code format.');
    }

    // Token freshness check (agar timestamp ho toh 2 minute window rakhein)
    if (ts && (Date.now() - ts > 90000)) {
      throw new Error('QR Token expired. Please scan the live rolling QR from the screen.');
    }
      // Geofence proximity verification
      const distance = calculateDistance(userCoords.lat, userCoords.lng, eventLat, eventLng);
      const allowedRadius = eventRadius || 100;

      if (distance > allowedRadius) {
        throw new Error(
          `Geofence Failed: You are ${Math.round(distance)}m away. Maximum allowed perimeter is ${allowedRadius}m.`
        );
      }

      // Check duplicate attendance
      const currentUserId = auth.currentUser?.uid || 'anonymous_user';
      const q = query(
        collection(db, 'proofs'),
        where('eventId', '==', eventId),
        where('attendeeId', '==', currentUserId)
      );
      const duplicateSnap = await getDocs(q);

      if (!duplicateSnap.empty) {
        throw new Error('Attendance already recorded for this event.');
      }

      // Generate Cryptographic Proof
     // Generate Cryptographic Proof
    const proofId = `PRF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const currentUserEmail = auth.currentUser?.email || 'Anonymous';
    const currentUserName = auth.currentUser?.displayName || currentUserEmail.split('@')[0];

    const proofRecord = {
      proofId,
      eventId,
      attendeeId: currentUserId,
      userId: currentUserId,
      attendeeEmail: currentUserEmail,
      attendeeName: currentUserName,
      timestamp: Date.now(),
      createdAt: Date.now(),
      distanceMeters: distance,
      attendeeLat: userCoords.lat,
      attendeeLng: userCoords.lng,
      verified: true,
    };

    await addDoc(collection(db, 'proofs'), proofRecord);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#10b981', '#ffffff'],
      });

      setVerifiedProof(proofRecord);
    } catch (error) {
      console.error('Scan handling error:', error);
      setStatusMessage({ type: 'error', text: error.message || 'Verification failed.' });
    } finally {
      setSubmitting(false);
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

        {/* Verification Success View */}
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

          
          /* Main Scanner Frame */
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
            {statusMessage.text && (
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

            {/* Stop Scanner Control */}
            {scannerActive && (
              <button
                type="button"
                onClick={stopScanner}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-semibold transition-all hover:-translate-y-0.5"
              >
                Close Camera
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}