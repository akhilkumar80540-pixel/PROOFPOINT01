import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, CheckCircle2, ArrowRight, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScanQR() {
  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState(''); // State for manual entry
  const navigate = useNavigate();

  useEffect(() => {
    if (scanResult) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [0] 
      },
      false
    );

    const onScanSuccess = (decodedText) => {
      setScanResult(decodedText);
      scanner.clear();
    };

    const onScanFailure = (error) => {
      // console.warn(error); 
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [scanResult]);

  // Function to handle manual ID submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim().length > 3) {
      setScanResult(manualId.trim().toUpperCase());
      // Camera band karne ki koshish karein (agar chal raha ho)
      try { document.getElementById('html5-qrcode-button-camera-stop')?.click(); } catch(e){}
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        
        {scanResult ? (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Ready!</h2>
            <p className="text-gray-500 mb-6">Event ID successfully captured.</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full mb-6 font-mono text-lg text-gray-800 uppercase">
              {scanResult}
            </div>

            <button 
              onClick={() => navigate(`/verify-location/${scanResult}`)}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 transition-colors"
            >
              Verify My Location <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Event QR</h2>
            <p className="text-gray-500 mb-6">Point your camera at the event QR code to check in.</p>
            
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg border-2 border-gray-200 mb-6"></div>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Manual Entry Form */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                <Keyboard className="h-4 w-4" /> Enter Event ID Manually
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. EV-XXXXXX"
                  className="flex-grow rounded-md border-gray-300 border p-3 shadow-sm focus:border-primary focus:ring-primary sm:text-sm uppercase"
                  required
                />
                <button 
                  type="submit"
                  className="bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
}