import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ShieldCheck, Copy, Loader2, ArrowLeft, Link as LinkIcon, ExternalLink, User, Hash } from 'lucide-react';
import { anchorProofToBlockchain } from '../utils/blockchainUtils';

export default function ProofResult() {
  const { proofId } = useParams();
  const [proof, setProof] = useState(null);
  const [proofDocId, setProofDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [txHash, setTxHash] = useState(null);

  useEffect(() => {
    const fetchProof = async () => {
      try {
        const q = query(collection(db, "proofs"), where("proofId", "==", proofId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setProof(snapshot.docs[0].data());
          setProofDocId(snapshot.docs[0].id);
          setTxHash(snapshot.docs[0].blockchainTxHash);
        }
      } catch (error) {
        console.error("Error fetching proof:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [proofId]);

  const handleAnchor = async () => {
    setIsAnchoring(true);
    try {
      const transactionHash = await anchorProofToBlockchain(proof.proofHash);
      
      const proofRef = doc(db, "proofs", proofDocId);
      await updateDoc(proofRef, {
        blockchainTxHash: transactionHash
      });

      setTxHash(transactionHash);
      alert("Successfully anchored to blockchain!");
    } catch (error) {
      console.error("Anchoring failed:", error);
      alert("Failed to anchor. Make sure Hardhat node is running.");
    } finally {
      setIsAnchoring(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!proof) return <div className="text-center mt-20 text-xl font-bold text-red-600">Proof not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        
        <div className="flex flex-col items-center mb-8 border-b pb-8">
          <ShieldCheck className="h-20 w-20 text-primary mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Attendance Proof Generated</h2>
          <p className="text-gray-500 mt-2 text-center">Your attendance has been cryptographically signed with your identity and location.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Proof ID</label>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="font-mono text-lg font-bold text-gray-900">{proof.proofId}</span>
              <Copy className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-700 ml-auto" onClick={() => navigator.clipboard.writeText(proof.proofId)} />
            </div>
          </div>

          {/* Student Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <div>
                <label className="block text-xs font-medium text-gray-500">Student Name</label>
                <div className="font-bold text-gray-900">{proof.studentName || 'N/A'}</div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center gap-3">
              <Hash className="h-8 w-8 text-primary" />
              <div>
                <label className="block text-xs font-medium text-gray-500">Roll Number</label>
                <div className="font-bold text-gray-900">{proof.rollNumber || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-1">Event</label>
              <div className="font-semibold text-gray-900">{proof.eventName}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-1">Distance Verified</label>
              <div className="font-semibold text-green-600">{proof.distanceMeters} meters</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Cryptographic SHA-256 Hash</label>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm break-all">
              {proof.proofHash}
            </div>
          </div>

          {/* BLOCKCHAIN ANCHORING SECTION */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" /> Web3 Blockchain Anchoring
            </h3>
            
            {txHash ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <p className="text-sm text-green-800 font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Secured on Ethereum (Local)
                </p>
                <div className="text-xs text-green-700 font-mono break-all bg-green-100 p-2 rounded">
                  TxHash: {txHash}
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-indigo-800">
                  Anchor this attendance record to Ethereum blockchain for permanent tamper-proof storage.
                </p>
                <button 
                  onClick={handleAnchor}
                  disabled={isAnchoring}
                  className="whitespace-nowrap flex items-center gap-2 py-2 px-6 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {isAnchoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {isAnchoring ? 'Anchoring...' : 'Anchor to Blockchain'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-indigo-800 font-medium">
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </Link>
        </div>
        
      </div>
    </div>
  );
}