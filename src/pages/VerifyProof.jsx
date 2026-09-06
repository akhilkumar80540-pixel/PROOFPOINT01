import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { verifyProofOnChain } from '../utils/blockchainUtils';
import { ShieldCheck, Search, Loader2, XCircle, CheckCircle2, User, Hash, Clock, MapPin } from 'lucide-react';

export default function VerifyProof() {
  const [proofIdInput, setProofIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [onChainStatus, setOnChainStatus] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!proofIdInput.trim()) return;

    setLoading(true);
    setError('');
    setProofData(null);
    setOnChainStatus(null);

    try {
      // 1. Firebase se proof fetch karein
      const q = query(
        collection(db, "proofs"), 
        where("proofId", "==", proofIdInput.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Proof ID not found in database.");
        setLoading(false);
        return;
      }

      const data = snapshot.docs[0].data();
      setProofData(data);

      // 2. Local Smart Contract se check karein
      try {
        const chainRes = await verifyProofOnChain(data.proofHash);
        setOnChainStatus(chainRes);
      } catch (err) {
        console.error("Smart contract read failed:", err);
        setOnChainStatus({ exists: false, error: "Could not query smart contract" });
      }

    } catch (err) {
      console.error(err);
      setError("An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-900">Decentralized Proof Verifier</h1>
        <p className="text-gray-500 text-sm mt-1">Validate student attendance authenticity against Ethereum smart contract state</p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleVerify} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            required
            value={proofIdInput}
            onChange={(e) => setProofIdInput(e.target.value)}
            placeholder="Enter Proof ID (e.g. LP-W7LGOS)"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg uppercase font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:bg-indigo-400"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center text-red-600 font-medium text-sm mb-6 flex items-center justify-center gap-2">
          <XCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Verification Result Card */}
      {proofData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-green-50 border-b border-green-200 p-6 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-green-900">Valid Cryptographic Attendance Proof</h2>
              <p className="text-xs text-green-700">Records match cryptographic signatures and geofence standards.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Student & Event Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5" /> Student Name
                </span>
                <span className="font-bold text-gray-900">{proofData.studentName || 'N/A'}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <Hash className="w-3.5 h-3.5" /> Roll Number
                </span>
                <span className="font-bold font-mono text-gray-900">{proofData.rollNumber || 'N/A'}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Timestamp
                </span>
                <span className="font-semibold text-gray-900 text-sm">
                  {new Date(proofData.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Geofence Verification
                </span>
                <span className="font-semibold text-green-600 text-sm">
                  Verified ({proofData.distanceMeters}m from origin)
                </span>
              </div>
            </div>

            {/* Smart Contract Blockchain Confirmation */}
            <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl">
              <span className="text-xs font-bold text-indigo-900 uppercase block mb-2">
                On-Chain Verification Status
              </span>
              
              {onChainStatus?.exists ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Immutable Record Confirmed on Ethereum
                  </p>
                  <p className="text-xs text-gray-600">
                    Smart Contract Store Timestamp: {new Date(onChainStatus.blockTimestamp * 1000).toLocaleString()}
                  </p>
                  {proofData.blockchainTxHash && (
                    <div className="text-xs font-mono text-indigo-700 break-all pt-1">
                      Tx: {proofData.blockchainTxHash}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-700 font-medium">
                  Verified in database, but not yet anchored on-chain.
                </p>
              )}
            </div>

            {/* SHA-256 Digest */}
            <div>
              <span className="text-xs text-gray-500 block mb-1">Cryptographic Fingerprint (SHA-256)</span>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
                {proofData.proofHash}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}