import { useState } from 'react';
import { ethers } from 'ethers';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateProof, getLeafHash } from '../utils/merkleUtils';
import { CheckCircle2, XCircle, Search, Loader2 } from 'lucide-react';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [
  "function verifyProofMembership(string memory eventId, bytes32 leafHash, bytes32[] memory proof) external view returns (bool)"
];

export default function VerifyProof() {
  const [proofIdInput, setProofIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!proofIdInput.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      // 1. Firebase se proof document dhoondhein
      const q = query(collection(db, "proofs"), where("proofId", "==", proofIdInput.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult({ verified: false, message: "Proof ID not found in database." });
        setLoading(false);
        return;
      }

      const record = { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (!record.blockchainTxHash) {
        setResult({ verified: false, message: "Record found but not anchored on blockchain yet." });
        setLoading(false);
        return;
      }

      // 2. Us event ke saare records fetch karein taaki exact tree reconstruct ho sake
      const eventProofsQuery = query(collection(db, "proofs"), where("eventId", "==", record.eventId));
      const eventSnap = await getDocs(eventProofsQuery);
      const allAttendees = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Batch match: wahi attendees filter karein jo is transaction me anchored hue the
      const batchAttendees = allAttendees.filter(a => a.blockchainTxHash === record.blockchainTxHash);

      // 3. Merkle proof construct karein
      const proofData = generateProof(batchAttendees, record);
      if (!proofData) {
        throw new Error("Unable to reconstruct Merkle tree.");
      }

      // 4. Contract se query karein (bina metamask login ke, direct provider)
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
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
        message: isValid ? "Cryptographically Verified On-Chain!" : "Blockchain rejected the proof!"
      });
    } catch (err) {
      console.error(err);
      setResult({ verified: false, message: "Verification failed: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Attendance Proof</h1>
      <p className="text-sm text-gray-500 mb-6">Enter a student's Proof ID to verify existence on Ethereum.</p>

      <form onSubmit={handleVerify} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="e.g. PRF-XXXXXX"
          value={proofIdInput}
          onChange={(e) => setProofIdInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verify
        </button>
      </form>

      {result && (
        <div className={`p-5 rounded-xl border ${result.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.verified ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-semibold ${result.verified ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </span>
          </div>

          {result.data && (
            <div className="text-xs space-y-1.5 font-mono text-gray-700 border-t pt-3 mt-3 border-gray-200">
              <p><strong>Student:</strong> {result.data.studentName} ({result.data.rollNumber})</p>
              <p><strong>Event ID:</strong> {result.data.eventId}</p>
              <p><strong>Tx Hash:</strong> {result.txHash}</p>
              <p><strong>Merkle Root:</strong> {result.merkleRoot}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}