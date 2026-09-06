import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Clock, Users, Copy, Check, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateEvent() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(200);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill current location of Organizer
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
        },
        (error) => {
          alert("Could not get current location: " + error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventId = 'EV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newEvent = {
        eventId,
        name,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters, 10),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), newEvent);
      setCreatedEvent(newEvent);
    } catch (err) {
      console.error(err);
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const shareableUrl = createdEvent 
    ? `${window.location.origin}/verify-location/${createdEvent.eventId}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsapp = () => {
    const text = encodeURIComponent(`Mark your attendance for *${createdEvent.name}* here:\n${shareableUrl}\nEvent Code: ${createdEvent.eventId}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {!createdEvent ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Create New Event
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AI & ML Workshop, CS-301 Lecture"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of the event..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Location Geofencing
                </h3>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="text-xs bg-indigo-50 text-primary hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200"
                >
                  Use My Current GPS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 31.4828"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 76.1921"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="5000"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium bg-primary hover:bg-indigo-700 disabled:bg-indigo-400 transition"
            >
              {loading ? 'Creating Event...' : 'Create & Generate Sharable QR'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-xl mx-auto">
          <div className="inline-block p-3 bg-green-50 rounded-full mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Event Created Successfully!</h2>
          <p className="text-sm text-gray-500 mb-6">Display this QR or share the direct link with participants.</p>

          <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 inline-block">
            <QRCodeSVG value={shareableUrl} size={200} level="H" />
          </div>

          <div className="space-y-3 mb-6 text-left">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 block">Manual Event Code:</span>
                <span className="font-mono text-lg font-bold text-gray-900">{createdEvent.eventId}</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(createdEvent.eventId)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Copy Code
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 block mb-1">Sharable Attendance Link:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="w-full bg-white text-xs px-2 py-1.5 border rounded font-mono text-gray-600 truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 bg-gray-900 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShareWhatsapp}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
            >
              <Share2 className="w-4 h-4" /> Share on WhatsApp
            </button>
            <Link
              to={`/event-attendance/${createdEvent.eventId}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
            >
              <Users className="w-4 h-4" /> View Live Attendance
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}