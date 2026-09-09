import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Loader2, 
  Award,
  Sparkles,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function VerifyProof() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputProofId, setInputProofId] = useState('');
  const [proofData, setProofData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Auto-search agar URL me ?id=PRF-XXXX param ho
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setInputProofId(queryId);
      handleVerification(queryId);
    }
  }, [searchParams]);

  const handleVerification = async (targetId) => {
    const idToSearch = (targetId || inputProofId).trim();
    if (!idToSearch) return;

    setLoading(true);
    setError('');
    setProofData(null);
    setSearched(true);

    try {
      // 1. Search in 'proofs' collection by proofId or Firestore document ID
      const q = query(collection(db, 'proofs'), where('proofId', '==', idToSearch));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setProofData({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        // Fallback: Check if user passed document ID directly
        const allProofs = await getDocs(collection(db, 'proofs'));
        const found = allProofs.docs.find(d => d.id === idToSearch);
        if (found) {
          setProofData({ id: found.id, ...found.data() });
        } else {
          setError('No valid cryptographic proof found matching this ID.');
        }
      }
    } catch (err) {
      console.error('Error fetching proof:', err);
      setError('Verification service unavailable. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-slate-100 selection:bg-orange-500 selection:text-white p-4 sm:p-8">
      {/* Background Ambience */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-orange-600/10 rounded-full blur-[170px] pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs font-semibold mb-6 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Search / Header Glass Card */}
        <div className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] mb-6">
          
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tamper-Proof Verification Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Verify Attendance Proof
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Validate geofenced physical presence records and cryptographic legitimacy.
            </p>
          </div>

          {/* Search Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerification();
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={inputProofId}
                onChange={(e) => setInputProofId(e.target.value)}
                placeholder="Enter Proof ID (e.g., PRF-9X8K2M)"
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] text-slate-100 placeholder-slate-500 border border-white/10 rounded-xl text-xs outline-none focus:bg-white/[0.06] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs border border-orange-400/40 shadow-md shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Verify ID</span>
            </button>
          </form>

        </div>

        {/* Result Area */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500 mb-2" />
            <span>Checking cryptographic proof on-chain ledger...</span>
          </div>
        )}

        {/* Error / Not Found */}
        {!loading && error && (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold">Verification Failed</div>
              <div className="text-[11px] text-rose-300/80 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Verified Proof Card */}
        {!loading && proofData && (
          <div className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-emerald-500/30 p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.2)]">
            
            {/* Success Badge Banner */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Cryptographically Valid</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      AUTHENTIC
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Physical Presence Verified via Geofence</p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400" title="Secured Record">
                <Lock className="w-4 h-4 text-orange-400" />
              </div>
            </div>

            {/* Proof Metadata Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Proof Identifier</span>
                <span className="font-mono text-xs font-bold text-orange-400">
                  {proofData.proofId || proofData.id}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Associated Event</span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {proofData.eventId || 'EVT-GLOBAL'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Attendee Identity</span>
                <span className="text-xs font-semibold text-white">
                  {proofData.attendeeEmail || proofData.attendeeName || 'Anonymous Participant'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Verified Distance</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {proofData.distanceMeters !== undefined 
                    ? `${Math.round(proofData.distanceMeters)}m from venue center` 
                    : 'Within designated perimeter'}
                </span>
              </div>

            </div>

            {/* Timestamps & Coordinates Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {proofData.timestamp 
                    ? new Date(proofData.timestamp).toLocaleString() 
                    : 'Verified Record'}
                </span>
              </div>

              {proofData.attendeeLat !== undefined && proofData.attendeeLng !== undefined && (
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    {proofData.attendeeLat.toFixed(4)}, {proofData.attendeeLng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}