import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function CreateEvent() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radiusMeters: '',
    startTime: '',
    endTime: ''
  });

  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedEventId, setGeneratedEventId] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateEventId = () => {
    return 'EV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const newEventId = generateEventId();
      
      const eventDocument = {
        eventId: newEventId,
        name: formData.name,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radiusMeters: parseInt(formData.radiusMeters, 10),
        startTime: formData.startTime,
        endTime: formData.endTime,
        organizerId: "demo-organizer", 
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      await addDoc(collection(db, 'events'), eventDocument);

      // Save the generated ID to state so we can pass it to the QR Code
      setGeneratedEventId(newEventId);
      setStatus('success');
      
    } catch (error) {
      console.error("Error adding document: ", error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', latitude: '', longitude: '', radiusMeters: '', startTime: '', endTime: ''
    });
    setGeneratedEventId(null);
    setStatus('idle');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Verification Event</h2>

        {/* Error Message */}
        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Error: {errorMessage}</p>
          </div>
        )}

        {/* Success & QR Code Display */}
        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-green-600 mb-6">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-xl font-bold">Event Created Successfully!</h3>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
              <QRCodeSVG value={generatedEventId} size={200} level="H" />
            </div>
            
            <p className="text-gray-600 font-mono bg-gray-200 px-4 py-2 rounded-md mb-8">
              Event ID: {generatedEventId}
            </p>
            
            <button 
              onClick={resetForm}
              className="flex items-center gap-2 py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <QrCode className="h-4 w-4" /> Create Another Event
            </button>
          </div>
        ) : (
          /* Event Creation Form */
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                placeholder="e.g. AI Workshop" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" required value={formData.description} onChange={handleChange} rows="2"
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                placeholder="Brief description of the event" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Latitude</label>
                <input type="number" step="any" name="latitude" required value={formData.latitude} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                  placeholder="e.g. 31.3260" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                <input type="number" step="any" name="longitude" required value={formData.longitude} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                  placeholder="e.g. 76.2592" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                <input type="number" name="radiusMeters" required value={formData.radiusMeters} onChange={handleChange} min="10"
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                  placeholder="100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input type="datetime-local" name="startTime" required value={formData.startTime} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input type="datetime-local" name="endTime" required value={formData.endTime} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-indigo-400"
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving & Generating QR...
                </span>
              ) : (
                "Create Event & Generate QR"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}