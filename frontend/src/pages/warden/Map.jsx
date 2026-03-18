import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import PropTypes from 'prop-types';
import L from 'leaflet';
import { outpassAPI, locationAPI } from '../../api/endpoints';
import { useAuthStore, useThemeStore } from '../../store';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';
import { FiMenu, FiSearch } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';



// ── Palette of distinct colors for student markers ──
const STUDENT_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
];

function getStudentColor(index) {
  return STUDENT_COLORS[index % STUDENT_COLORS.length];
}

// Create a round, colored SVG marker with the student's initials and status badges
function createStudentIcon(name, color, isSelected, battery, isOverdue) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const size = isSelected ? 46 : 38;
  const border = isSelected ? 3 : 2;
  const showBatteryWarning = battery !== null && battery <= 20;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 14}" height="${size + 24}" viewBox="0 0 ${size + 14} ${size + 24}">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      ${isOverdue ? `
        <circle cx="${(size + 14) / 2}" cy="${size / 2 + 5}" r="${size / 2 + 4}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2">
          <animateTransform attributeName="transform" type="rotate" from="0 ${(size + 14) / 2} ${size / 2 + 5}" to="360 ${(size + 14) / 2} ${size / 2 + 5}" dur="4s" repeatCount="indefinite" />
        </circle>
      ` : ''}

      <circle cx="${(size + 14) / 2}" cy="${size / 2 + 5}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="${border}" filter="${isSelected ? 'url(#glow)' : ''}"/>
      
      <text x="${(size + 14) / 2}" y="${size / 2 + 10}" text-anchor="middle" fill="white"
        font-family="Inter, system-ui, sans-serif" font-size="${isSelected ? 15 : 13}" font-weight="900">${initials}</text>
      
      <polygon points="${(size + 14) / 2 - 6},${size + 2} ${(size + 14) / 2 + 6},${size + 2} ${(size + 14) / 2},${size + 14}" fill="${color}"/>

      ${showBatteryWarning ? `
        <g transform="translate(${size + 2}, 5)">
          <circle r="7" fill="#ef4444" stroke="white" stroke-width="1.5" />
          <path d="M-1 -3 L-1 1 M-1 2 L-1 3" stroke="white" stroke-width="1.5" stroke-linecap="round" transform="translate(1,0)" />
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
        </g>
      ` : ''}

      ${isOverdue ? `
        <g transform="translate(5, 5)">
          <circle r="7" fill="#f59e0b" stroke="white" stroke-width="1.5" />
          <path d="M-2 -2 L2 2 M2 -2 L-2 2" stroke="white" stroke-width="1.2" stroke-linecap="round" />
        </g>
      ` : ''}
    </svg>`;

  return L.divIcon({
    html: svg,
    className: 'custom-marker-icon',
    iconSize: [size + 14, size + 24],
    iconAnchor: [(size + 14) / 2, size + 14],
    popupAnchor: [0, -(size + 14)],
  });
}

// Component to center and zoom map to fit all active markers
function FitAllMarkers({ students }) {
  const map = useMap();
  useEffect(() => {
    const validPositions = students
      .filter(s => s.latitude !== 0 && s.longitude !== 0)
      .map(s => [s.latitude, s.longitude]);

    if (validPositions.length > 0) {
      const bounds = L.latLngBounds(validPositions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 1.5 });
    }
  }, [students, map]);
  return null;
}

FitAllMarkers.propTypes = {
  students: PropTypes.array.isRequired
};

// Component to programmatically fly to a specific student
function FlyToStudent({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 18, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

FlyToStudent.propTypes = {
  target: PropTypes.array
};

export default function Map() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState([13.0125, 80.0215]);
  const [, setWsConnected] = useState(false);
  const [routeHistory, setRouteHistory] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'overdue', 'moving'
  const { user } = useAuthStore();
  const { dark } = useThemeStore();
  const wsRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const isUnmounting = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000;
  const HEARTBEAT_INTERVAL = 30000;

  useEffect(() => {
    isUnmounting.current = false;
    fetchActiveStudents();
    connectWebSocket();
    return () => {
      isUnmounting.current = true;
      if (wsRef.current) wsRef.current.close();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);



  const fetchLocationHistory = async (requestId, studentId) => {
    try {
      const response = await locationAPI.getLocations(requestId);
      const locations = response.data;
      if (locations.length > 0) {
        const route = locations
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map((loc) => [loc.latitude, loc.longitude]);
        setRouteHistory((prev) => ({ ...prev, [requestId]: route }));
      }
      setSelectedStudentId(studentId);
    } catch (err) {
      console.error('Failed to fetch location history:', err);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.student_id);
    if (student.latitude !== 0 && student.longitude !== 0) {
      setFlyTarget([student.latitude, student.longitude]);
    }
    if (student.outpass_request_id) {
      fetchLocationHistory(student.outpass_request_id, student.student_id);
    }
  };

  const getReconnectDelay = (attempt) =>
    BASE_RECONNECT_DELAY * Math.pow(2, Math.min(attempt, 4));

  const sendHeartbeat = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  const scheduleReconnect = () => {
    if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('disconnected');
      return;
    }
    setConnectionStatus('reconnecting');
    const delay = getReconnectDelay(reconnectCountRef.current);
    reconnectTimeoutRef.current = setTimeout(() => { connectWebSocket(); }, delay);
  };

  const fetchActiveStudents = async () => {
    try {
      const response = await outpassAPI.getActiveStudents();
      setActiveStudents(response.data);
      const valid = response.data.find(s => s.latitude !== 0 && s.longitude !== 0);
      if (valid) setCenter([valid.latitude, valid.longitude]);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error('Failed to fetch active students:', errorMsg);
      toastService.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setConnectionStatus('connecting');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When in development (localhost), connect directly to backend port 8001
    // to bypass potential proxy issues with WebSockets
    const isLocalhost = window.location.hostname === 'localhost';
    const wsHost = isLocalhost ? 'localhost:8001' : window.location.host;
    const pathPrefix = isLocalhost ? '' : '/api';
    const wsUrl = `${wsProtocol}//${wsHost}${pathPrefix}/ws/location/${token}`;
    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => {
        setWsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      };
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'location_update') {
            const { data } = message;
            setActiveStudents((prev) => {
              const index = prev.findIndex(s => s.student_id === data.student_id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], ...data };
                if (selectedStudentId === data.student_id) {
                  fetchLocationHistory(data.outpass_request_id, data.student_id);
                }
                return updated;
              }
              return [...prev, data];
            });
          } else if (message.type === 'active_students') {
            setActiveStudents(message.data);
            const valid = message.data.find(s => s.latitude !== 0 && s.longitude !== 0);
            if (valid) setCenter([valid.latitude, valid.longitude]);
          } else if (message.type === 'status_update') {
            const { student_id, status } = message;
            if (status === 'closed' || status === 'rejected' || status === 'expired') {
              setActiveStudents(prev => prev.filter(s => s.student_id !== student_id));
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      wsRef.current.onerror = () => {
        setWsConnected(false);
        setConnectionStatus('disconnected');
      };
      wsRef.current.onclose = () => {
        setWsConnected(false);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (!isUnmounting.current && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current += 1;
          scheduleReconnect();
        } else {
          setConnectionStatus('disconnected');
        }
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  };

  const now = new Date();

  // Process all students to inject color and simple overdue status
  const studentsProcessed = activeStudents.map((s, i) => ({
    ...s,
    color: getStudentColor(i),
    isOverdue: s.expected_return_time && new Date(s.expected_return_time) < now,
  }));

  // Apply search & explicit filters
  const studentsWithColor = studentsProcessed.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'overdue') return s.isOverdue;
    if (activeFilter === 'moving') {
      // Assuming a non-zero speed value in metadata, or just returning those with known coordinates
      return s.latitude !== 0 && s.longitude !== 0;
    }
    return true; // "all"
  });

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading map...</p>
          <div className="flex justify-center gap-1">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-white dark:bg-[#0F1117] relative">
      <style>
        {`
          @keyframes dash {
            to { stroke-dashoffset: -20; }
          }
          .animated-route {
            animation: dash 3s linear infinite;
          }
          /* Premium Glassmorphic Popup Styling */
          .custom-glass-popup .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.9) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            border-radius: 24px !important;
            box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.15) !important;
            padding: 8px !important;
          }
          .dark .custom-glass-popup .leaflet-popup-content-wrapper {
            background: rgba(15, 17, 23, 0.85) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            color: white !important;
          }
          .custom-glass-popup .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.9) !important;
            backdrop-filter: blur(20px) !important;
          }
          .dark .custom-glass-popup .leaflet-popup-tip {
            background: rgba(15, 17, 23, 0.85) !important;
          }
          .custom-glass-popup .leaflet-popup-close-button {
            color: #9ca3af !important;
            padding: 12px !important;
          }
        `}
      </style>

      {/* ── LEFT SIDEBAR ── */}
      <div
        className={`flex-shrink-0 bg-white/70 dark:bg-[#151921]/70 backdrop-blur-3xl border-r border-gray-100 dark:border-white/5 shadow-2xl z-20 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'w-85 relative translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}`}
      >
        {/* Tracker Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
              <FiSearch size={12} /> Intelligence
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Ops</h2>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-white/10"
          >
            <FiMenu size={20} />
          </button>
        </div>

        {/* Connection status */}
        <div className="px-6 py-4">
          <div className="premium-card glass p-4 bg-gray-50/50 dark:bg-white/5 border-white/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`h-3 w-3 rounded-full flex-shrink-0 ${connectionStatus === 'connected'
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse'
                    }`}
                />
                {connectionStatus === 'connected' && (
                  <span className="absolute inset-0 h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-400">System Link</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                  {connectionStatus === 'connected' ? 'Established • Live' : 'Link Interrupted'}
                </span>
              </div>
            </div>
            {connectionStatus !== 'connected' && (
              <button
                onClick={() => { reconnectCountRef.current = 0; connectWebSocket(); }}
                className="mt-4 w-full text-[10px] font-black tracking-widest uppercase bg-rose-500 text-white px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-500/20"
              >
                Re-establish Link
              </button>
            )}
          </div>
        </div>

        {/* Search Filters */}
        <div className="px-6 pb-4 space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <FiSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Filter by ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11 py-3 bg-gray-50/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'All', color: 'indigo' },
              { id: 'overdue', label: 'Overdue', color: 'rose' },
              { id: 'moving', label: 'Moving', color: 'emerald' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${activeFilter === f.id
                  ? `bg-${f.color}-500 text-white shadow-${f.color}-500/25`
                  : 'bg-white dark:bg-white/5 text-gray-500 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-2 custom-scrollbar">
          {studentsWithColor.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                <span className="text-gray-300 text-2xl font-bold">N/A</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Zero matches in sector</p>
            </div>
          ) : (
            studentsWithColor.map((student) => {
              const isSelected = selectedStudentId === student.student_id;
              return (
                <button
                  key={student.student_id}
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full group/item p-4 rounded-2xl transition-all duration-300 border ${isSelected
                    ? 'bg-blue-500/10 border-blue-500/30 shadow-xl shadow-blue-500/5'
                    : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg transition-transform group-hover/item:scale-105"
                        style={{ backgroundColor: student.color, boxShadow: `0 8px 16px -4px ${student.color}40` }}
                      >
                        {student.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      {student.isOverdue && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse shadow-sm" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${isSelected ? 'text-blue-500' : 'text-gray-900 dark:text-white'}`}>
                        {student.student_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.student_id}</span>
                        <span className="text-gray-300 dark:text-white/10">•</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{student.destination}</span>
                      </div>
                    </div>
                  </div>

                  {student.battery_level !== null && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200/50 dark:border-white/5 p-[1px]">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${student.battery_level <= 20 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-emerald-500'}`}
                          style={{ width: `${student.battery_level}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-black tracking-widest ${student.battery_level <= 20 ? 'text-rose-500' : 'text-gray-400'}`}>
                        {student.battery_level}%
                      </span>
                    </div>
                  )}

                  {student.timestamp && (
                    <div className="mt-2 flex items-center justify-between opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Sync: {new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">View Trace →</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="flex-1 relative z-10 w-full h-full">
        {/* Floating Toggle Button (Appears when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 left-6 z-[1000] p-4 premium-card glass shadow-2xl hover:scale-110 active:scale-95 transition-all group/toggle text-indigo-500 border-indigo-500/20"
          >
            <FiMenu size={24} className="group-hover/toggle:rotate-180 transition-transform duration-500" />
          </button>
        )}

        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className="relative z-10"
          zoomControl={false}
        >
          <FitAllMarkers students={studentsWithColor} />
          {flyTarget && <FlyToStudent target={flyTarget} />}

          {dark ? (
            <TileLayer
              key="dark-map"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
          ) : (
            <TileLayer
              key="light-map"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
          )}

          {/* Render geometry (lines, circles) */}
          {studentsWithColor.map((student) => {
            if (student.latitude === 0 && student.longitude === 0) return null;
            const isSelected = selectedStudentId === student.student_id;

            return (
              <div key={`geom-${student.student_id}`}>
                {isSelected && routeHistory[student.outpass_request_id]?.length > 0 && (
                  <Polyline
                    positions={routeHistory[student.outpass_request_id]}
                    pathOptions={{
                      color: student.color,
                      weight: 6,
                      opacity: 0.8,
                      dashArray: '15, 15',
                      className: 'animated-route'
                    }}
                  />
                )}

                {isSelected && (
                  <Circle
                    center={[student.latitude, student.longitude]}
                    radius={50}
                    pathOptions={{
                      color: student.color,
                      fillColor: student.color,
                      fillOpacity: 0.15,
                      weight: 1,
                      dashArray: '5, 5'
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Render Markers */}
          {studentsWithColor.map((student) => {
            if (student.latitude === 0 && student.longitude === 0) return null;
            const isSelected = selectedStudentId === student.student_id;
            const icon = createStudentIcon(
              student.student_name,
              student.color,
              isSelected,
              student.battery_level,
              student.isOverdue
            );

            return (
              <Marker
                key={`marker-${student.student_id}`}
                position={[student.latitude, student.longitude]}
                icon={icon}
                eventHandlers={{ click: () => handleSelectStudent(student) }}
              >
                <Popup minWidth={300} className="custom-glass-popup">
                  <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 border-b border-gray-100 dark:border-white/5 pb-5">
                      <div
                        className="w-14 h-14 rounded-[20px] flex items-center justify-center text-xl font-black text-white shadow-2xl"
                        style={{ backgroundColor: student.color, boxShadow: `0 12px 24px -6px ${student.color}50` }}
                      >
                        {student.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1 truncate">{student.student_name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-none">Sector ID: {student.student_id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="premium-card glass p-3 bg-gray-50/50 dark:bg-white/5 border-white/20">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Operational Status</p>
                        {student.isOverdue ? (
                          <div className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] uppercase">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Overdue
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Nominal
                          </div>
                        )}
                      </div>

                      <div className="premium-card glass p-3 bg-gray-50/50 dark:bg-white/5 border-white/20">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Power Supply</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black ${student.battery_level <= 20 ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>{student.battery_level}%</span>
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div className={`h-full rounded-full ${student.battery_level <= 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${student.battery_level}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 px-1">
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-gray-400 uppercase tracking-widest">Target Dest</span>
                        <span className="text-gray-900 dark:text-gray-100 uppercase truncate max-w-[150px]">{student.destination}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-gray-400 uppercase tracking-widest">Return Alpha</span>
                        <span className="text-gray-900 dark:text-gray-100">{new Date(student.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => fetchLocationHistory(student.outpass_request_id, student.student_id)}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase transition-all shadow-xl border-t active:scale-[0.98] ${isSelected && routeHistory[student.outpass_request_id] ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/20' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-700 hover:bg-black dark:hover:bg-gray-100'}`}
                    >
                      {isSelected && routeHistory[student.outpass_request_id] ? 'Tactical Trace Active' : 'Initiate Sector Scan'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );

}
