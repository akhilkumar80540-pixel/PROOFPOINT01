import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculateDistance } from '../utils/locationUtils';
import { generateSHA256 } from '../utils/hashUtils';
import { Loader2, CheckCircle, XCircle, User, Hash } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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

  // New states for Student details
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [formError, setFormError] = useState('');

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
          setMessage('Location permission denied. Please allow GPS location in browser settings.');
        },
        { enableHighAccuracy: true }
      );
      
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('A network error occurred.');
    }
  };

 const handleGenerateProof = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedRoll = rollNumber.trim().toUpperCase();
    const trimmedName = studentName.trim();

    if (!trimmedName || !trimmedRoll) {
      setFormError('Please provide both your Full Name and Roll Number.');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. One-Submission Enforcement Check
      const duplicateQuery = query(
        collection(db, 'proofs'),
        where('eventId', '==', verificationData.event.eventId),
        where('rollNumber', '==', trimmedRoll)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        setFormError(`Attendance already recorded for Roll Number: ${trimmedRoll}. Multiple submissions are not allowed.`);
        setIsGenerating(false);
        return;
      }

      const proofId = 'LP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      
      // 2. Data string with Student Name and Roll No for hashing
      const dataToHash = `${trimmedName}|${trimmedRoll}|${verificationData.event.eventId}|${verificationData.userLat}|${verificationData.userLng}|${timestamp}|${verificationData.distance}`;
      
      // 3. Generate SHA-256 Hash
      const proofHash = await generateSHA256(dataToHash);

      // 4. Create Proof Object
      const proofObject = {
        proofId,
        studentName: trimmedName,
        rollNumber: trimmedRoll,
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

      // 5. Save to Firebase
      await addDoc(collection(db, 'proofs'), proofObject);
      
      // 6. Redirect to result page
      navigate(`/proof/${proofId}`);
      
    } catch (error) {
      console.error("Error generating proof:", error);
      setFormError("Failed to generate proof. Please check your network connection.");
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

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 w-full space-y-4 mb-6">
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

            {/* Student Info Input & Submit */}
            {status === 'success' && (
              <form onSubmit={handleGenerateProof} className="w-full space-y-4">
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Enter Your Attendance Details</h3>
                  <p className="text-xs text-gray-500 mb-4">Your name and roll number will be cryptographically signed into the attendance proof.</p>
                  
                  {formError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200 mb-3">
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
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Roll Number / Student ID</label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          placeholder="e.g. 23CS015"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isGenerating}
                  className="mt-6 flex justify-center items-center w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating Cryptographic Proof...
                    </>
                  ) : (
                    'Generate & Submit Attendance Proof'
                  )}
                </button>
              </form>
            )}

            {status === 'failed' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-center w-full">
                <p className="text-sm text-red-700 font-medium">You cannot submit attendance because you are outside the event radius or time slot.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}