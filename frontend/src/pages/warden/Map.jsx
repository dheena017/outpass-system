import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { outpassAPI, locationAPI } from '../../api/endpoints';
import { useAuthStore, useSidebarStore } from '../../store';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';
import { FiMenu } from 'react-icons/fi';
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

// Create a round, colored SVG marker with the student's initials
function createStudentIcon(name, color, isSelected) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  const size = isSelected ? 44 : 36;
  const border = isSelected ? 3 : 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - border}" fill="${color}" stroke="white" stroke-width="${border}"/>
      <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" fill="white"
        font-family="Arial,sans-serif" font-size="${isSelected ? 14 : 12}" font-weight="bold">${initials}</text>
      <polygon points="${size / 2 - 6},${size - 4} ${size / 2 + 6},${size - 4} ${size / 2},${size + 8}" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 10)],
  });
}

// Component to programmatically fly to a position
function FlyToStudent({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 17, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Component to set initial view only
function SetMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function Map() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState([13.0125, 80.0215]);
  const [, setWsConnected] = useState(false);
  const [routeHistory, setRouteHistory] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuthStore();
  const { isOpen: mainSidebarOpen, toggle: toggleMainSidebar } = useSidebarStore();
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
    setReconnectAttempts(reconnectCountRef.current + 1);
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/location/${token}`;
    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => {
        setWsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        setReconnectAttempts(0);
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
  const studentsWithColor = activeStudents.map((s, i) => ({
    ...s,
    color: getStudentColor(i),
    isOverdue: s.expected_return_time && new Date(s.expected_return_time) < now,
  }));

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
    <div className="flex w-full h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* ── LEFT SIDEBAR ── */}
      <div
        className={`flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl z-20 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-80 relative' : 'w-12 overflow-hidden'}`}
      >
        {/* Tracker Header & Main Menu Toggle */}
        <div className={`flex items-center justify-between h-12 bg-gradient-to-r from-indigo-500 to-blue-600 shadow-md ${sidebarOpen ? 'px-2' : 'flex-col justify-start pt-2 px-0 gap-2'}`}>
          {/* Hamburger button for Main WardenNav Sidebar */}
          {!mainSidebarOpen && (
            <button
              onClick={toggleMainSidebar}
              className={`flex-shrink-0 p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors ${!sidebarOpen ? 'mb-2' : ''}`}
              title="Open Main Menu"
            >
              <FiMenu size={20} />
            </button>
          )}

          {/* Toggle button for Tracking Sidebar */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className={`flex-1 flex items-center text-white text-xs font-bold tracking-widest uppercase transition-all hover:text-blue-200 ${sidebarOpen ? 'h-full justify-start pl-2' : 'justify-center writing-vertical h-full pb-2'}`}
            title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {sidebarOpen ? '◀ Hide Tracker' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Connection status */}
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full flex-shrink-0 shadow-sm ${connectionStatus === 'connected'
                    ? 'bg-emerald-500 shadow-emerald-500/50'
                    : connectionStatus === 'reconnecting'
                      ? 'bg-amber-400 animate-pulse shadow-amber-400/50'
                      : connectionStatus === 'connecting'
                        ? 'bg-orange-400 animate-pulse shadow-orange-400/50'
                        : 'bg-rose-500 shadow-rose-500/50'
                    }`}
                />
                <span className="text-sm font-bold tracking-wide uppercase text-gray-700 dark:text-gray-300">
                  {connectionStatus === 'connected'
                    ? 'Live Tracking'
                    : connectionStatus === 'reconnecting'
                      ? `Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
                      : connectionStatus === 'connecting'
                        ? 'Connecting…'
                        : 'Offline'}
                </span>
              </div>
              {connectionStatus !== 'connected' && (
                <button
                  onClick={() => { reconnectCountRef.current = 0; connectWebSocket(); }}
                  className="mt-3 w-full text-xs font-bold tracking-wider uppercase bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors active:scale-95 shadow-sm"
                >
                  Reconnect
                </button>
              )}
            </div>

            {/* Student count header */}
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 tracking-wide">
                {studentsWithColor.length === 0
                  ? 'No students outside'
                  : `${studentsWithColor.length} student${studentsWithColor.length !== 1 ? 's' : ''} tracking`}
              </h2>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto">
              {studentsWithColor.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <p className="text-3xl mb-2">🏠</p>
                  <p>All students are inside</p>
                </div>
              ) : (
                studentsWithColor.map((student) => {
                  const isSelected = selectedStudentId === student.student_id;
                  const hasLocation = student.latitude !== 0 && student.longitude !== 0;
                  return (
                    <button
                      key={student.student_id}
                      onClick={() => handleSelectStudent(student)}
                      className={`w-full text-left px-5 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 transition-all ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-l-4' : 'bg-transparent border-l-4 border-l-transparent'}`}
                      style={{ borderLeftColor: isSelected ? student.color : 'transparent' }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color dot */}
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0 ring-4 ring-white shadow-sm dark:ring-gray-800"
                          style={{ backgroundColor: student.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                            ID: {student.student_id}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate mt-0.5 flex items-center gap-1">
                            <span>📍</span> {student.destination}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {student.isOverdue ? (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              Overdue
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {new Date(student.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {!hasLocation && (
                            <p className="text-xs text-amber-500 mt-0.5">No GPS yet</p>
                          )}
                        </div>
                      </div>

                      {/* Battery indicator */}
                      {student.battery_level !== null && student.battery_level !== undefined && (
                        <div className="mt-3 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${student.battery_level > 20 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}
                              style={{ width: `${student.battery_level}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-extrabold w-8 text-right ${student.battery_level <= 20 ? 'text-rose-500' : 'text-gray-500 dark:text-gray-400'}`}>{student.battery_level}%</span>
                        </div>
                      )}

                      {/* Last seen */}
                      {student.timestamp && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Updated {new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MAP ── */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={15} className="w-full h-full">
          <SetMapView center={center} zoom={15} />
          {flyTarget && <FlyToStudent target={flyTarget} />}

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Render geometry (lines, circles) OUTSIDE the cluster group */}
          {studentsWithColor.map((student) => {
            if (student.latitude === 0 && student.longitude === 0) return null;
            const isSelected = selectedStudentId === student.student_id;

            return (
              <div key={`geom-${student.student_id}`}>
                {/* Route polyline */}
                {isSelected && routeHistory[student.outpass_request_id]?.length > 0 && (
                  <Polyline
                    positions={routeHistory[student.outpass_request_id]}
                    pathOptions={{ color: student.color, weight: 3, opacity: 0.8, dashArray: '6, 6' }}
                  />
                )}

                {/* Accuracy circle */}
                {student.accuracy && (
                  <Circle
                    center={[student.latitude, student.longitude]}
                    radius={student.accuracy}
                    pathOptions={{ color: student.color, fillColor: student.color, fillOpacity: 0.08, weight: 1 }}
                  />
                )}
              </div>
            );
          })}

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            showCoverageOnHover={false}
          >
            {studentsWithColor.map((student) => {
              if (student.latitude === 0 && student.longitude === 0) return null;
              const isSelected = selectedStudentId === student.student_id;
              const icon = createStudentIcon(student.student_name, student.isOverdue ? '#ef4444' : student.color, isSelected);

              return (
                <Marker
                  key={`marker-${student.student_id}`}
                  position={[student.latitude, student.longitude]}
                  icon={icon}
                  eventHandlers={{ click: () => handleSelectStudent(student) }}
                >
                  <Popup minWidth={230}>
                    <div className="text-sm space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: student.color }} />
                        <p className="font-bold text-gray-800">{student.student_name}</p>
                        {student.isOverdue && (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-1 rounded">Overdue</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                      <p><span className="font-semibold">Destination:</span> {student.destination}</p>
                      <p><span className="font-semibold">Departure:</span> {new Date(student.departure_time).toLocaleTimeString()}</p>
                      <p>
                        <span className="font-semibold">Return by:</span>{' '}
                        <span className={student.isOverdue ? 'text-red-600 font-bold' : ''}>
                          {new Date(student.expected_return_time).toLocaleTimeString()}
                        </span>
                      </p>
                      {student.battery_level !== null && student.battery_level !== undefined && (
                        <p className={student.battery_level <= 20 ? 'text-red-600' : 'text-green-600'}>
                          🔋 Battery: {student.battery_level}%
                        </p>
                      )}
                      {student.accuracy && (
                        <p className="text-xs text-gray-400">GPS accuracy: ±{student.accuracy.toFixed(0)}m</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(student.timestamp).toLocaleTimeString()}
                      </p>
                      <button
                        onClick={() => fetchLocationHistory(student.outpass_request_id, student.student_id)}
                        className="mt-1 w-full text-white text-xs font-semibold px-3 py-1.5 rounded transition"
                        style={{ backgroundColor: student.color }}
                      >
                        {isSelected && routeHistory[student.outpass_request_id]
                          ? '✓ Route Visible'
                          : '🗺 View Route'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
