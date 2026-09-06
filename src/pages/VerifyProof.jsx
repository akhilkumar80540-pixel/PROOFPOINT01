import { ShieldCheck } from 'lucide-react';

export default function VerifyProof() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <ShieldCheck className="h-12 w-12 text-primary mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">Verify Location Proof</h2>
          <p className="text-gray-500 mt-2">Enter a Proof ID to cryptographically verify attendance and check the blockchain anchor.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Proof ID</label>
            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3 shadow-sm focus:border-primary focus:ring-primary sm:text-sm uppercase font-mono" placeholder="LP-XXXXXX" />
          </div>
          <button className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
            Verify Integrity
          </button>
        </div>
      </div>
    </div>
  );
}