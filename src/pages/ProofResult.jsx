import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ShieldCheck, User, Hash, MapPin, Calendar, ExternalLink, Loader2, Download } from 'lucide-react';
import { anchorProofWithMetaMask } from '../utils/blockchainUtils';

// Isko HATA do:
// import html2canvas from 'html2canvas';

// Isko ADD karo:
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ProofResult() {
  const { proofId } = useParams();
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [proofDocId, setProofDocId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchProof = async () => {
      try {
        const q = query(collection(db, "proofs"), where("proofId", "==", proofId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setProof(docSnap.data());
          setProofDocId(docSnap.id);
          if (docSnap.data().blockchainTxHash) {
            setTxHash(docSnap.data().blockchainTxHash);
          }
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
      const transactionHash = await anchorProofWithMetaMask(proof.proofHash);
      
      const proofRef = doc(db, "proofs", proofDocId);
      await updateDoc(proofRef, {
        blockchainTxHash: transactionHash
      });

      setTxHash(transactionHash);
      alert("Successfully anchored to blockchain via MetaMask!");
    } catch (error) {
      console.error("Anchoring failed:", error);
      alert(error.message || "Failed to anchor. Please confirm transaction in MetaMask.");
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const element = document.getElementById('receipt-card');
      
      // Use html-to-image instead of html2canvas
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2, // High resolution
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 15; // 15mm margin
      const imgWidth = pdfWidth - (margin * 2);
      
      // Calculate height based on aspect ratio
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`ProofPoint_Pass_${proof.rollNumber}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF pass. Check console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500 font-medium">Retrieving cryptographic proof...</p>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-red-200 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Proof Not Found</h2>
        <p className="text-gray-600 mb-6">The requested attendance record does not exist or has been modified.</p>
        <Link to="/" className="text-primary font-semibold hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 
        The id="receipt-card" ensures that html2canvas only captures 
        the certificate portion, excluding the top nav and bottom buttons.
      */}
      <div id="receipt-card" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 p-1">
        <div className="p-8 text-center border-b border-gray-100">
          <div className="inline-block p-3 bg-indigo-50 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Attendance Proof Generated</h1>
          <p className="text-sm text-gray-500">Your attendance has been cryptographically signed with your identity and location.</p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proof ID</label>
            <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="font-mono font-bold text-gray-900 text-lg">{proof.proofId}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <span className="block text-xs text-gray-500">Student Name</span>
                <span className="font-bold text-gray-900">{proof.studentName}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <Hash className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <span className="block text-xs text-gray-500">Roll Number</span>
                <span className="font-bold text-gray-900">{proof.rollNumber}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <span className="block text-xs text-gray-500">Event</span>
                <span className="font-bold text-gray-900">{proof.eventName}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <span className="block text-xs text-gray-500">Distance Verified</span>
                <span className="font-bold text-green-600">{proof.distanceMeters} meters</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cryptographic SHA-256 Hash</label>
            <div className="bg-gray-900 rounded-lg p-3 overflow-hidden">
              <p className="font-mono text-xs text-green-400 break-all leading-relaxed">
                {proof.proofHash}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-gray-400" /> Web3 Blockchain Anchoring
            </h3>
            
            {txHash ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4" /> Secured on Ethereum
                </p>
                <p className="text-xs text-green-700 break-all font-mono">TxHash: {txHash}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-0.5">Not Anchored Yet</p>
                  <p className="text-xs text-amber-700">Anchor this proof to the blockchain to make it immutable.</p>
                </div>
                <button
                  onClick={handleAnchor}
                  disabled={isAnchoring}
                  className="whitespace-nowrap bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  {isAnchoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {isAnchoring ? 'Anchoring...' : 'Anchor to Blockchain'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold py-2.5 px-6 rounded-xl transition"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isDownloading ? 'Generating PDF...' : 'Download PDF Pass'}
        </button>
        <Link 
          to="/dashboard" 
          className="flex items-center justify-center text-primary font-semibold py-2.5 px-6 hover:bg-indigo-50 rounded-xl transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}