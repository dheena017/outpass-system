/**
 * Geofencing utilities for location-based triggers
 * Calculate distances and check if location is within geofence
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance;
}

/**
 * Check if a location is within a geofence radius
 * @param {number} currentLat - Current latitude
 * @param {number} currentLon - Current longitude
 * @param {number} targetLat - Target/destination latitude
 * @param {number} targetLon - Target/destination longitude
 * @param {number} radius - Geofence radius in meters (default 1000m = 1km)
 * @returns {Object} {isInside: boolean, distance: number}
 */
export function isWithinGeofence(currentLat, currentLon, targetLat, targetLon, radius = 1000) {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return {
    isInside: distance <= radius,
    distance: Math.round(distance),
  };
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(2)}km`;
  }
}

/**
 * Parse destination string to extract coordinates if available
 * Format examples: "Home (12.34, 56.78)" or "Bangalore"
 * @param {string} destination - Destination string
 * @returns {Object|null} {lat, lon} or null if not parseable
 */
export function parseDestinationCoordinates(destination) {
  if (!destination) return null;
  
  // Look for coordinates in format (lat, lon)
  const coordPattern = /\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/;
  const match = destination.match(coordPattern);
  
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
    };
  }
  
  return null;
}

/**
 * Geocode a location name to coordinates (placeholder - would need API)
 * @param {string} locationName - Name of the location
 * @returns {Promise<Object|null>} {lat, lon} or null
 */
export async function geocodeLocation(locationName) {
  // This would typically call a geocoding API like Google Maps, OpenStreetMap, etc.
  // For now, return null - implement when geocoding service is available
  console.warn('Geocoding not implemented yet for:', locationName);
  return null;
}

/**
 * Get geofence status description
 * @param {number} distance - Distance in meters
 * @param {number} radius - Geofence radius in meters
 * @returns {string} Status description
 */
export function getGeofenceStatus(distance, radius = 1000) {
  if (distance <= radius) {
    return '✅ Inside geofence';
  } else if (distance <= radius * 1.5) {
    return '⚠️ Near geofence boundary';
  } else {
    return '❌ Outside geofence';
  }
}

/**
 * Check if student should auto-return based on geofence
 * @param {number} distance - Distance from destination in meters
 * @param {number} arrivalRadius - Radius to consider "arrived" (default 100m)
 * @returns {boolean} True if student has arrived
 */
export function hasArrived(distance, arrivalRadius = 100) {
  return distance <= arrivalRadius;
}

export default {
  calculateDistance,
  isWithinGeofence,
  formatDistance,
  parseDestinationCoordinates,
  geocodeLocation,
  getGeofenceStatus,
  hasArrived,
};
