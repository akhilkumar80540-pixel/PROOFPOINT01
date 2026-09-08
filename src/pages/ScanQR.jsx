import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Keyboard, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScanQR() {
  const [manualId, setManualId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  // Helper function to handle both full URLs and raw Event IDs
  const handleDestinationRoute = (scannedText) => {
    const trimmed = scannedText.trim();

    // 1. Agar QR me poora URL encode hua hai
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const urlObj = new URL(trimmed);
        // React Router ke route path + search params nikaalo
        const targetPath = urlObj.pathname + urlObj.search;
        navigate(targetPath);
        return;
      } catch (err) {
        console.error("Invalid URL scanned:", err);
      }
    }

    // 2. Agar QR me seedha '/verify-location/...' path hai
    if (trimmed.startsWith('/verify-location')) {
      navigate(trimmed);
      return;
    }

    // 3. Agar user ne sirf Event ID di hai (e.g. EV-XXXXXX)
    const cleanId = trimmed.toUpperCase();
    navigate(`/verify-location/${cleanId}`);
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [0] 
      },
      false
    );

    scannerRef.current = scanner;

    const onScanSuccess = (decodedText) => {
      setIsProcessing(true);
      try {
        scanner.clear();
      } catch (e) {
        console.warn("Scanner clear error", e);
      }
      handleDestinationRoute(decodedText);
    };

    const onScanFailure = () => {
      // Ignore background scan frame misses
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  // Manual submission form
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim().length >= 3) {
      setIsProcessing(true);
      try {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      } catch (err) {}
      handleDestinationRoute(manualId.trim());
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
        
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <h3 className="text-base font-bold text-gray-900">Routing to Verification...</h3>
            <p className="text-xs text-gray-500">Preparing GPS & token checks</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Scan Event QR</h2>
            <p className="text-gray-500 text-xs mb-6">Point your camera at the live rolling QR code on the presenter screen.</p>
            
            {/* Camera Box */}
            <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-gray-200 mb-6"></div>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Manual Entry Form */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 uppercase">
                <Keyboard className="h-3.5 w-3.5" /> Enter Event ID Manually
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. EV-XXXXXX"
                  className="flex-grow rounded-lg border-gray-300 border px-3.5 py-2.5 shadow-xs text-sm uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
                <button 
                  type="submit"
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1"
                >
                  Submit <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
}