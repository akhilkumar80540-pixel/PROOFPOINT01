import { useEffect, useState } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Check, Copy, Share2, Users, RefreshCw, Crosshair } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { generateRollingToken, getCurrentWindow, TOKEN_WINDOW_SECONDS } from '../utils/tokenUtils';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Default coordinates
  const [position, setPosition] = useState([31.4808, 76.1991]);
  const [radiusMeters, setRadiusMeters] = useState(200);
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  const [currentToken, setCurrentToken] = useState('');
  const [currentWindow, setCurrentWindow] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(TOKEN_WINDOW_SECONDS);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
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
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to create an event.");
        navigate('/login');
        return;
      }

      const eventId = 'EV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newEvent = {
        eventId,
        name,
        description,
        organizerId: user.uid,
        organizerEmail: user.email || '',
        status: 'active',
        latitude: parseFloat(position[0].toFixed(6)),
        longitude: parseFloat(position[1].toFixed(6)),
        radiusMeters: parseInt(radiusMeters, 10),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), newEvent);
      setCreatedEvent(newEvent);
    } catch (err) {
      console.error(err);
      alert("Failed to create event: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!createdEvent) return;

    const updateToken = async () => {
      const win = getCurrentWindow();
      const token = await generateRollingToken(createdEvent.eventId, win);
      setCurrentWindow(win);
      setCurrentToken(token);
    };

    updateToken();

    const interval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = TOKEN_WINDOW_SECONDS - (nowSec % TOKEN_WINDOW_SECONDS);
      setSecondsRemaining(remaining);

      if (remaining === TOKEN_WINDOW_SECONDS) {
        updateToken();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdEvent]);

  const dynamicUrl = createdEvent && currentToken
    ? `${window.location.origin}/verify-location/${createdEvent.eventId}?token=${currentToken}&window=${currentWindow}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(dynamicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = `Check in for the event using this secure rolling link: ${dynamicUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {!createdEvent ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Create New Event
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. System Design Lecture"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief details about the event..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

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

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2 mb-1">
                    <MapPin className="h-5 w-5 text-primary" /> Interactive Geofence Map
                  </h3>
                  <p className="text-xs text-gray-500">Click on the map to set the center point.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="text-xs bg-indigo-50 text-primary hover:bg-indigo-100 font-semibold px-3 py-2 rounded-lg border border-indigo-200 flex items-center gap-1"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Locate Me
                </button>
              </div>

              {/* Leaflet Map Integration */}
              <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-300 mb-4 z-0 relative">
                <MapContainer 
                  center={position} 
                  zoom={16} 
                  scrollWheelZoom={true} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker position={position} setPosition={setPosition} />
                  <Circle 
                    center={position} 
                    radius={radiusMeters} 
                    pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.2 }} 
                  />
                </MapContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={position[0].toFixed(6)}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={position[1].toFixed(6)}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Radius (Meters)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{radiusMeters}m</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium bg-primary hover:bg-indigo-700 disabled:bg-indigo-400 transition mt-4"
            >
              {loading ? 'Creating Event...' : 'Create & Generate Dynamic QR'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-xl mx-auto">
          <div className="inline-block p-3 bg-green-50 rounded-full mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Dynamic QR Active</h2>
          <p className="text-xs text-gray-500 mb-6">
            Anti-spoofing active. This QR code rotates automatically every {TOKEN_WINDOW_SECONDS} seconds.
          </p>

          <div className="flex flex-col items-center justify-center mb-6 p-6 bg-gray-50 rounded-2xl border border-gray-200 inline-block w-full">
            {dynamicUrl && <QRCodeSVG value={dynamicUrl} size={220} level="H" />}
            <div className="w-full max-w-xs mt-4">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-500 mb-1">
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Rolling Token
                </span>
                <span>Refreshes in {secondsRemaining}s</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsRemaining / TOKEN_WINDOW_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition shadow-sm"
              >
                <Share2 className="w-4 h-4" /> Share via WhatsApp
              </button>
              
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition border border-gray-300"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied Link!' : 'Copy Link'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/event-attendance/${createdEvent.eventId}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                <Users className="w-4 h-4" /> View Live Roster
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}