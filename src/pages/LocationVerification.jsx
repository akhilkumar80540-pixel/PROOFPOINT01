import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculateDistance } from '../utils/locationUtils';
import { generateSHA256 } from '../utils/hashUtils';
import { MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function LocationVerification() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Fetching event details...');
  const [verificationData, setVerificationData] = useState(null);
  
  // Yaha humne naya state add kiya loading dikhane ke liye
  const [isGenerating, setIsGenerating] = useState(false); 

  useEffect(() => {
    verifyLocationAndEvent();
  }, []);

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
            event, distance, userLat, userLng, isLocationValid, isTimeValid
          });

          if (isLocationValid && isTimeValid) {
            setStatus('success');
            setMessage('Location & Time Verified Successfully!');
          } else {
            setStatus('failed');
            setMessage('Verification Failed.');
          }
        },
        (error) => {
          setStatus('error');
          setMessage('Location permission denied. We cannot verify your attendance without GPS access.');
        },
        { enableHighAccuracy: true }
      );
      
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('A network error occurred.');
    }
  };

  // Yaha humne naya function add kiya hai jo Button click par chalega
  const handleGenerateProof = async () => {
    setIsGenerating(true);
    try {
      const proofId = 'LP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      
      // 1. Create canonical data string for hashing
      const dataToHash = `demo-student|${verificationData.event.eventId}|${verificationData.userLat}|${verificationData.userLng}|${timestamp}|${verificationData.distance}`;
      
      // 2. Generate SHA-256 Hash
      const proofHash = await generateSHA256(dataToHash);

      // 3. Create Proof Object
      const proofObject = {
        proofId,
        userId: 'demo-student', // Hardcoded for MVP
        eventId: verificationData.event.eventId,
        eventName: verificationData.event.name,
        latitude: verificationData.userLat,
        longitude: verificationData.userLng,
        timestamp,
        distanceMeters: verificationData.distance,
        locationVerified: verificationData.isLocationValid,
        timeVerified: verificationData.isTimeValid,
        proofHash: proofHash,
        blockchainTxHash: null,
        createdAt: serverTimestamp()
      };

      // 4. Save to Firebase
      await addDoc(collection(db, 'proofs'), proofObject);
      
      // 5. Redirect to result page
      navigate(`/proof/${proofId}`);
      
    } catch (error) {
      console.error("Error generating proof:", error);
      alert("Failed to generate proof");
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        
        {(status === 'loading' || status === 'checking') && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{message}</h2>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/scan-qr')} className="bg-gray-900 text-white px-6 py-2 rounded-lg">Try Again</button>
          </div>
        )}

        {(status === 'success' || status === 'failed') && verificationData && (
          <div className="flex flex-col items-center text-left w-full">
            <div className="flex items-center justify-center w-full mb-6">
              {status === 'success' ? (
                 <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                 <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            
            <h2 className={`text-2xl font-bold text-center w-full mb-6 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </h2>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 w-full space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Event:</span>
                <span className="font-semibold text-gray-900">{verificationData.event.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Distance from event:</span>
                <span className={`font-bold ${verificationData.isLocationValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.distance} meters
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Allowed Radius:</span>
                <span className="font-semibold">{verificationData.event.radiusMeters} meters</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Time Window:</span>
                <span className={`font-bold ${verificationData.isTimeValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationData.isTimeValid ? 'Valid ✓' : 'Invalid ✕'}
                </span>
              </div>
            </div>

            {/* Yaha button update ho gaya hai */}
            {status === 'success' && (
              <button 
                onClick={handleGenerateProof}
                disabled={isGenerating}
                className="mt-8 flex justify-center items-center w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating Proof...
                  </>
                ) : (
                  'Generate cryptographic Proof'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}