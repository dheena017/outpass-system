import { useState, useEffect } from 'react';
import { locationAPI } from '../api/endpoints';
import { FiMapPin, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import PropTypes from 'prop-types';

export default function LocationTracker({ activeRequestId }) {
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

    navigator.geolocation.watchPosition(
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
    navigator.geolocation.clearWatch();
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
        <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
          <div>
            <span className="font-semibold">Latitude:</span> {lastLocation.latitude.toFixed(6)}
          </div>
          <div>
            <span className="font-semibold">Longitude:</span> {lastLocation.longitude.toFixed(6)}
          </div>
          {accuracy && (
            <div>
              <span className="font-semibold">Accuracy:</span> ±{accuracy.toFixed(2)}m
            </div>
          )}
          {battery && (
            <div>
              <span className="font-semibold">Battery:</span> {battery}%
            </div>
          )}
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
