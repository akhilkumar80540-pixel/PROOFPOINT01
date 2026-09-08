import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { db, collection, query, where, getDocs } from '../firebase/config';
import { generateProof } from '../utils/merkleUtils';
import { CheckCircle2, XCircle, Search, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xa8a382A1F2D9cFB2978F86f496483B91c01cAC50";
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const CONTRACT_ABI = [
  "function verifyProofMembership(string memory eventId, bytes32 leafHash, bytes32[] memory proof) external view returns (bool)"
];

export default function VerifyProof() {
  const [searchParams] = useSearchParams();
  const [proofIdInput, setProofIdInput] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const executeVerification = useCallback(async (targetId) => {
    const idToVerify = targetId.trim();
    if (!idToVerify) return;

    setLoading(true);
    setResult(null);

    try {
      // 1. Fetch proof document from Firestore
      const q = query(collection(db, "proofs"), where("proofId", "==", idToVerify));
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult({ verified: false, message: "Proof ID not found in database." });
        setLoading(false);
        return;
      }

      const record = { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (!record.blockchainTxHash) {
        setResult({ 
          verified: false, 
          message: "Record found in database, but it has not been anchored to Ethereum Sepolia yet." 
        });
        setLoading(false);
        return;
      }

      // 2. Fetch all proofs for this event to reconstruct the identical batch tree
      const eventProofsQuery = query(collection(db, "proofs"), where("eventId", "==", record.eventId));
      const eventSnap = await getDocs(eventProofsQuery);
      const allAttendees = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Batch match: filter attendees anchored in this specific transaction
      const batchAttendees = allAttendees.filter(a => a.blockchainTxHash === record.blockchainTxHash);

      // 3. Construct Merkle proof
      const proofData = generateProof(batchAttendees, record);
      if (!proofData) {
        throw new Error("Unable to reconstruct Merkle tree.");
      }

      // 4. Query contract directly via Sepolia RPC (zero MetaMask dependency)
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const isValid = await contract.verifyProofMembership(
        record.eventId,
        proofData.leaf,
        proofData.proof
      );

      setResult({
        verified: isValid,
        data: record,
        txHash: record.blockchainTxHash,
        merkleRoot: proofData.root,
        message: isValid 
          ? "Cryptographically Verified On-Chain!" 
          : "Blockchain rejected the Merkle proof."
      });
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ verified: false, message: "Verification failed: " + (err.reason || err.message) });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify if ID is provided via URL query parameter (e.g. /verify?id=PP-XXXXXX)
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setProofIdInput(queryId);
      executeVerification(queryId);
    }
  }, [searchParams, executeVerification]);

  const handleVerify = (e) => {
    e.preventDefault();
    executeVerification(proofIdInput);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-indigo-50 text-primary rounded-2xl mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verify Attendance Proof</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verify cryptographic inclusion of any attendance record on Ethereum Sepolia.
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="e.g. PP-XXXXXX or LP-XXXXXX"
          value={proofIdInput}
          onChange={(e) => setProofIdInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-mono"
        />
        <button
          type="submit"
          disabled={loading || !proofIdInput.trim()}
          className="bg-primary hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verify
        </button>
      </form>

      {result && (
        <div className={`p-6 rounded-2xl border ${result.verified ? 'bg-green-50/60 border-green-200' : 'bg-red-50/60 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            {result.verified ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <span className={`font-bold text-base ${result.verified ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </span>
          </div>

          {result.data && (
            <div className="text-xs space-y-2 font-mono text-gray-700 border-t pt-4 border-gray-200 bg-white p-4 rounded-xl shadow-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-sans">Attendee:</span>
                <span className="font-semibold text-gray-900">
                  {result.data.attendeeName || result.data.studentName || 'Attendee'} ({result.data.identifier || result.data.rollNumber || 'N/A'})
                </span>
              </div>
              
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-sans">Event ID:</span>
                <span className="font-semibold text-gray-900">{result.data.eventId}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-sans">Proof ID:</span>
                <span className="font-semibold text-primary">{result.data.proofId}</span>
              </div>

              {result.txHash && (
                <div className="py-1 border-b border-gray-100">
                  <div className="text-gray-500 font-sans mb-0.5">Blockchain Transaction:</div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                  >
                    {result.txHash}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {result.merkleRoot && (
                <div className="py-1">
                  <div className="text-gray-500 font-sans mb-0.5">Merkle Root:</div>
                  <span className="text-gray-600 break-all">{result.merkleRoot}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}