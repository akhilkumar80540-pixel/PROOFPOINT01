import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ShieldCheck, User, Hash, MapPin, Calendar, ExternalLink, Loader2, Download, CheckCircle2, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ProofResult() {
  const { proofId } = useParams();
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txHash, setTxHash] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchProof = async () => {
      try {
        const q = query(collection(db, "proofs"), where("proofId", "==", proofId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          setProof(data);
          if (data.blockchainTxHash) {
            setTxHash(data.blockchainTxHash);
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

  const attendeeName = proof?.attendeeName || proof?.studentName || 'Verified Attendee';
  const identifier = proof?.identifier || proof?.rollNumber || proof?.attendeeId || 'N/A';

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const element = document.getElementById('receipt-card');
      
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const imgWidth = pdfWidth - (margin * 2);
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`ProofPoint_Pass_${identifier.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF certificate. Please try again.");
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
        <p className="text-gray-600 mb-6 text-sm">The requested attendance record does not exist or has expired.</p>
        <Link to="/dashboard" className="text-primary font-semibold hover:underline text-sm">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Official Certificate Card captured by html-to-image */}
      <div id="receipt-card" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 p-1">
        <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-indigo-50/40 to-white">
          <div className="inline-block p-3 bg-indigo-50 text-primary rounded-full mb-3 shadow-xs">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Attendance Proof Pass</h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Official cryptographic attendance verification issued by ProofPoint.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Verified Proof ID</label>
            <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <span className="font-mono font-bold text-primary text-lg">{proof.proofId}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-gray-500">Attendee Name</span>
                <span className="font-bold text-gray-900 text-sm">{attendeeName}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-3">
              <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-gray-500">Identifier</span>
                <span className="font-bold text-gray-900 text-sm font-mono">{identifier}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-gray-500">Event</span>
                <span className="font-bold text-gray-900 text-sm">{proof.eventName || proof.eventId}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-gray-500">Distance Verified</span>
                <span className="font-bold text-green-600 text-sm">
                  {proof.distanceMeters !== undefined ? `${proof.distanceMeters} meters away` : 'Within Perimeter'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Cryptographic SHA-256 Hash
            </label>
            <div className="bg-gray-950 rounded-xl p-3.5 overflow-hidden">
              <p className="font-mono text-xs text-green-400 break-all leading-relaxed">
                {proof.proofHash}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" /> Blockchain Immutability Status
            </h3>
            
            {txHash ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-green-600" /> Anchored on Ethereum Sepolia
                </p>
                <p className="text-xs text-green-700 break-all font-mono mb-2">Tx: {txHash}</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Pending Organizer Blockchain Anchor</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your attendance is cryptographically recorded. Once the organizer finalizes the event batch, the Merkle root will be anchored on-chain.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 text-white bg-primary hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold py-2.5 px-6 rounded-xl transition shadow-sm text-sm"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isDownloading ? 'Generating PDF Certificate...' : 'Download Official PDF Pass'}
        </button>
        <Link 
          to="/dashboard" 
          className="w-full sm:w-auto flex items-center justify-center text-gray-700 hover:text-gray-900 font-semibold py-2.5 px-6 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}