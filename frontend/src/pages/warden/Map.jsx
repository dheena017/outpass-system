import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { outpassAPI, locationAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to programmatically update the map center
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
  const [center, setCenter] = useState([0, 0]);
  const [, setWsConnected] = useState(false);
  const [routeHistory, setRouteHistory] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, reconnecting
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user } = useAuthStore();
  const wsRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const isUnmounting = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000; // 1 second
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  useEffect(() => {
    isUnmounting.current = false;
    fetchActiveStudents();
    connectWebSocket();

    return () => {
      isUnmounting.current = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchLocationHistory = async (requestId, studentId) => {
    try {
      const response = await locationAPI.getLocations(requestId);
      const locations = response.data;
      if (locations.length > 0) {
        // Convert to lat/lng array for polyline
        const route = locations
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map((loc) => [loc.latitude, loc.longitude]);
        setRouteHistory((prev) => ({
          ...prev,
          [requestId]: route,
        }));
        setSelectedStudentId(studentId);
      }
    } catch (err) {
      console.error('Failed to fetch location history:', err);
    }
  };

  // Calculate exponential backoff delay
  const getReconnectDelay = (attempt) => {
    return BASE_RECONNECT_DELAY * Math.pow(2, Math.min(attempt, 4)); // Max 16 seconds
  };

  // Send heartbeat ping to keep connection alive
  const sendHeartbeat = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  // Handle reconnection with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
      toastService.error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('reconnecting');
    const delay = getReconnectDelay(reconnectCountRef.current);
    setReconnectAttempts(reconnectCountRef.current + 1);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  const fetchActiveStudents = async () => {
    try {
      const response = await outpassAPI.getActiveStudents();
      setActiveStudents(response.data);

      // Set center to the first student with a valid location
      const validStudent = response.data.find(s => s.latitude !== 0 && s.longitude !== 0);
      if (validStudent) {
        setCenter([
          validStudent.latitude,
          validStudent.longitude,
        ]);
      } else {
        // Default center if no students have location yet (Chembarambakkam, Chennai)
        setCenter([13.0125, 80.0215]); // Default to Chembarambakkam
      }
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

    // Use ws:// or wss:// depending on the current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/location/${token}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        setReconnectAttempts(0);
        // Start heartbeat to keep connection alive
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'location_update') {
            // Update the specific student's location
            const { data } = message;
            setActiveStudents((prev) => {
              const index = prev.findIndex((s) => s.student_id === data.student_id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], ...data };
                // Auto-fetch history for selected student
                if (selectedStudentId === data.student_id) {
                  fetchLocationHistory(data.outpass_request_id, data.student_id);
                }
                return updated;
              }
              return [...prev, data];
            });
          } else if (message.type === 'active_students') {
            // Initial list of active students
            setActiveStudents(message.data);
            const validStudent = message.data.find(s => s.latitude !== 0 && s.longitude !== 0);
            if (validStudent) {
              setCenter([
                validStudent.latitude,
                validStudent.longitude,
              ]);
            } else if (message.data.length === 0) {
              // Reset if empty
              setCenter([13.0125, 80.0215]);
            }
          } else if (message.type === 'status_update') {
            // Handle status changes
            const { student_id, status } = message;
            if (status === 'closed' || status === 'rejected' || status === 'expired') {
              // Remove student from map if request is closed
              setActiveStudents((prev) =>
                prev.filter((s) => s.student_id !== student_id)
              );
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        setConnectionStatus('disconnected');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);

        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt to reconnect with exponential backoff if not unmounting
        if (!isUnmounting.current && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current += 1;
          scheduleReconnect();
        } else {
          setConnectionStatus('disconnected');
          console.warn(`WebSocket disconnected after ${reconnectCountRef.current} attempts`);
        }
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  };

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
    <div className="relative w-full h-screen">
      {/* Status Indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-4 min-w-60">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`h-3 w-3 rounded-full ${connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'reconnecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
              }`}
          ></div>
          <span className="text-sm font-semibold">
            {connectionStatus === 'connected'
              ? '🟢 Live'
              : connectionStatus === 'reconnecting'
                ? `🟡 Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
                : connectionStatus === 'connecting'
                  ? '🟠 Connecting...'
                  : '🔴 Offline'}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          Tracking {activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''}
        </p>
        {connectionStatus !== 'connected' && (
          <button
            onClick={() => {
              reconnectCountRef.current = 0;
              connectWebSocket();
            }}
            className="mt-2 w-full text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition"
          >
            Reconnect
          </button>
        )}
      </div>

      <MapContainer center={center} zoom={15} className="w-full h-full">
        <SetMapView center={center} zoom={15} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {activeStudents.map((student) => {
          if (student.latitude === 0 && student.longitude === 0) return null;
          return (
            <div key={student.student_id}>
              {/* Route polyline (if selected) */}
              {selectedStudentId === student.student_id &&
                routeHistory[student.outpass_request_id] &&
                routeHistory[student.outpass_request_id].length > 0 && (
                  <Polyline
                    positions={routeHistory[student.outpass_request_id]}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 3,
                      opacity: 0.7,
                      dashArray: '5, 5',
                    }}
                  />
                )}

              {/* Accuracy circle */}
              {student.accuracy && (
                <Circle
                  center={[student.latitude, student.longitude]}
                  radius={student.accuracy}
                  pathOptions={{
                    color: 'blue',
                    fillColor: 'lightblue',
                    fillOpacity: 0.1,
                    weight: 1,
                  }}
                />
              )}
              {/* Marker */}
              <Marker
                position={[student.latitude, student.longitude]}
                eventHandlers={{
                  click: () => fetchLocationHistory(student.outpass_request_id, student.student_id),
                }}
              >
                <Popup>
                  <div className="text-sm space-y-2 w-64">
                    <p className="font-bold">{student.student_name}</p>
                    <p className="text-xs text-gray-600">ID: {student.student_id}</p>
                    <p><span className="font-semibold">Destination:</span> {student.destination}</p>
                    <p>
                      <span className="font-semibold">Departure:</span>{' '}
                      {new Date(student.departure_time).toLocaleTimeString()}
                    </p>
                    <p>
                      <span className="font-semibold">Return:</span>{' '}
                      {new Date(student.expected_return_time).toLocaleTimeString()}
                    </p>
                    {student.battery_level !== null && (
                      <p className="text-green-600">
                        🔋 Battery: {student.battery_level}%
                      </p>
                    )}
                    {student.accuracy && (
                      <p className="text-xs text-gray-500">
                        Accuracy: ±{student.accuracy.toFixed(1)}m
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Updated: {new Date(student.timestamp).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => fetchLocationHistory(student.outpass_request_id, student.student_id)}
                      className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                    >
                      {selectedStudentId === student.student_id && routeHistory[student.outpass_request_id]
                        ? '✓ Route Visible'
                        : 'View Route'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
