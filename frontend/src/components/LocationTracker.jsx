import { useState, useEffect, useRef } from 'react';
import { locationAPI } from '../api/endpoints';
import { FiMapPin, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LocationTracker({ activeRequestId }) {
  const watchIdRef = useRef(null);
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [battery, setBattery] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSupported] = useState(
    navigator.geolocation && navigator.permissions
  );

  // Get battery level (if available)
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then((batteryManager) => {
        setBattery(Math.round(batteryManager.level * 100));
        batteryManager.addEventListener('levelchange', () => {
          setBattery(Math.round(batteryManager.level * 100));
        });
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    if (!navigator.permissions) {
      setError('Permissions API not supported. Enabling location tracking...');
      startTracking();
      return;
    }

    try {
      const result = await navigator.permissions.query({
        name: 'geolocation',
      });

      if (result.state === 'granted' || result.state === 'prompt') {
        startTracking();
      } else if (result.state === 'denied') {
        setError('Location permission denied. Please enable it in settings.');
      }
    } catch (err) {
      // Fallback for browsers that don't support permissions API
      startTracking();
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError('');
    setSuccess('Requesting location...');

    // Get position with high accuracy
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;

        setLastLocation({ latitude, longitude });
        setAccuracy(gpsAccuracy);
        setTracking(true);
        setSuccess('Location tracked!');

        // Submit location to backend
        if (activeRequestId) {
          try {
            await locationAPI.submitLocation(activeRequestId, {
              latitude,
              longitude,
              accuracy: gpsAccuracy,
              battery_level: battery,
            });
          } catch (err) {
            console.error('Failed to submit location:', err);
          }
        }
      },
      (err) => {
        setTracking(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              'Location access denied. Enable it in browser settings.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError(`Error: ${err.message}`);
        }
      },
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setSuccess('Location tracking stopped');
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700">
          <FiAlertTriangle />
          <p>Geolocation is not supported on your device</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FiMapPin className="text-blue-500" />
          Live Location Tracking
        </h3>
        {tracking && <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center gap-2">
            <FiAlertTriangle />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <FiCheck />
          {success}
        </div>
      )}

      {lastLocation && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4 shadow-inner">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
              <span className="font-semibold text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider mb-1">Latitude</span>
              <span className="font-mono text-gray-800 dark:text-gray-200">{lastLocation.latitude.toFixed(6)}</span>
            </div>
            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
              <span className="font-semibold text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider mb-1">Longitude</span>
              <span className="font-mono text-gray-800 dark:text-gray-200">{lastLocation.longitude.toFixed(6)}</span>
            </div>
            {accuracy && (
              <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                <span className="font-semibold text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider mb-1">Accuracy</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">±{accuracy.toFixed(1)}m</span>
              </div>
            )}
            {battery && (
              <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                <span className="font-semibold text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider mb-1">Battery</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">{battery}%</span>
              </div>
            )}
          </div>

          {/* Mini Map embedded inside the Location Tracker */}
          <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm relative z-0">
            <MapContainer
              center={[lastLocation.latitude, lastLocation.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lastLocation.latitude, lastLocation.longitude]}>
                <Popup>You are here!</Popup>
              </Marker>
              {accuracy && (
                <Circle
                  center={[lastLocation.latitude, lastLocation.longitude]}
                  radius={accuracy}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!tracking ? (
          <button
            onClick={requestLocationPermission}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition"
          >
            Start Location Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition"
          >
            Stop Location Tracking
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Location will be updated periodically while you are out. Enable location
        services for best accuracy.
      </p>
    </div>
  );
}

LocationTracker.propTypes = {
  activeRequestId: PropTypes.number
};
