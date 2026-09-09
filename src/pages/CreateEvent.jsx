import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  LocateFixed, 
  PlusCircle, 
  Loader2, 
  ArrowLeft, 
  Sparkles,
  Timer,
  Sliders
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default marker icon paths in React / Bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper 1: Re-center and smoothly fly map when location updates
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Helper 2: Handle user clicks directly on the Leaflet map
function LocationPickerMarker({ position, onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!position || isNaN(position[0]) || isNaN(position[1])) return null;
  return <Marker position={position} />;
}

import { useEffect } from 'react';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [latitude, setLatitude] = useState('28.6139');
  const [longitude, setLongitude] = useState('77.2090');
  const [radiusMeters, setRadiusMeters] = useState(100);

  // Automatic Duration Calculation across Start Date/Time and End Date/Time
  const durationText = useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) {
      return 'Set both dates & times';
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();

    if (isNaN(diffMs)) return 'Invalid date/time';
    if (diffMs <= 0) {
      return 'End must be after start';
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);

    return parts.join(' ');
  }, [startDate, endDate, startTime, endTime]);

  // GPS Auto-fetch & Map Pan
  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        setError(`Location access failed: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (lat, lng) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!auth.currentUser) {
      setError('You must be signed in to create an event.');
      return;
    }

    if (durationText.includes('End must be after start') || durationText.includes('Set both')) {
      setError('Please provide valid start and end dates/times.');
      return;
    }

    setLoading(true);

    try {
      const generatedEventId = `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Convert start and end into ISO strings and milliseconds for accurate filtering
      const startDateTimeObj = new Date(`${startDate}T${startTime}`);
      const endDateTimeObj = new Date(`${endDate}T${endTime}`);

      await addDoc(collection(db, 'events'), {
        eventId: generatedEventId,
        organizerId: auth.currentUser.uid,
        name: name.trim(),
        description: description.trim(),
        date: startDate, // Dashboard compatibility
        startDate,
        endDate,
        startTime,
        endTime,
        // Standard millisecond timestamps taaki Dashboard filter turant pakad le
        startTimestamp: startDateTimeObj.getTime(),
        endTimestamp: endDateTimeObj.getTime(),
        duration: durationText,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters, 10) || 100,
        archived: false,
        createdAt: Date.now(), // Realtime timestamp for instant sorting
      });

      // Successful save hone ke baad dashboard redirect
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return [isNaN(lat) ? 28.6139 : lat, isNaN(lng) ? 77.2090 : lng];
  }, [latitude, longitude]);

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-slate-100 selection:bg-orange-500 selection:text-white py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs font-semibold mb-6 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Main Glass Card */}
        <div className="relative rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/10 p-6 sm:p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]">
          
          {/* Header */}
          <div className="mb-8 border-b border-white/5 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Geofence Protocol Config</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Geofenced Event
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select boundaries on the interactive map, adjust allowed radius, and set operational timelines.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Event Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., ProofPoint Web3 Summit 2026"
                className="w-full px-4 py-2.5 bg-white/[0.03] text-slate-100 placeholder-slate-500 border border-white/10 rounded-xl text-xs transition-all duration-200 outline-none focus:bg-white/[0.06] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-[0_0_20px_-3px_rgba(249,115,22,0.3)]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary or attendee requirements..."
                className="w-full px-4 py-2.5 bg-white/[0.03] text-slate-100 placeholder-slate-500 border border-white/10 rounded-xl text-xs transition-all duration-200 outline-none focus:bg-white/[0.06] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-[0_0_20px_-3px_rgba(249,115,22,0.3)] resize-none"
              />
            </div>

            {/* Timings: Start Date, Start Time, End Date, End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] text-slate-100 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Time *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] text-slate-100 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] text-slate-100 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Time *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] text-slate-100 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>
              </div>

            </div>

            {/* Read-Only Automatic Duration Bar */}
            <div>
              <label className="block text-xs font-semibold text-orange-400 mb-1.5 flex items-center justify-between">
                <span>Calculated Event Duration</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider">AUTO-COMPUTED</span>
              </label>
              <div className="relative">
                <Timer className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={durationText}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono font-medium select-none cursor-not-allowed border transition-colors ${
                    durationText.includes('End must be after start')
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : durationText.includes('Set both')
                      ? 'bg-white/[0.02] border-white/10 text-slate-500'
                      : 'bg-orange-500/10 border-orange-500/30 text-orange-300 shadow-sm shadow-orange-500/10'
                  }`}
                />
              </div>
            </div>

            {/* Interactive Map & Geofence Perimeter */}
            <div className="border-t border-white/5 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-400" /> Interactive Geofence Map
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click anywhere on the map or tap the button to fly to your live GPS.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  <span>{locating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
                </button>
              </div>

              {/* Map Preview Container with Auto Recenter */}
              <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-white/10 mb-5 z-0">
                <MapContainer
                  center={mapCenter}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {/* Automatically fly to new coordinates */}
                  <RecenterMap center={mapCenter} />
                  
                  {/* Click to change marker */}
                  <LocationPickerMarker
                    position={mapCenter}
                    onLocationChange={handleMapClick}
                  />

                  {/* Circular visual geofence boundary */}
                  <Circle
                    center={mapCenter}
                    radius={parseInt(radiusMeters, 10) || 50}
                    pathOptions={{
                      color: '#f97316',
                      fillColor: '#f97316',
                      fillOpacity: 0.25,
                      weight: 2,
                    }}
                  />
                </MapContainer>
              </div>

              {/* Radius Slider Bar (Line aage-peeche karne wala feature) */}
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    Allowed Check-in Radius (Meters)
                  </span>
                  <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                    {radiusMeters} meters
                  </span>
                </div>
                
                {/* Range Slider Track */}
                <input
                  type="range"
                  min="20"
                  max="1500"
                  step="10"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 transition-all"
                />
                
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                  <span>20m (Room / Hall)</span>
                  <span>500m (Campus)</span>
                  <span>1500m (Wide Area)</span>
                </div>
              </div>

              {/* Exact Lat & Long Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="28.6139"
                    className="w-full px-3.5 py-2 bg-white/[0.03] text-slate-100 placeholder-slate-600 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="77.2090"
                    className="w-full px-3.5 py-2 bg-white/[0.03] text-slate-100 placeholder-slate-600 border border-white/10 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white text-xs font-semibold border border-orange-400/40 shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Deploy Geofenced Event</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}