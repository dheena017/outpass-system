import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import PropTypes from 'prop-types';
import L from 'leaflet';
import { outpassAPI, locationAPI } from '../../api/endpoints';
import { useAuthStore, useThemeStore } from '../../store';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';
import {
  FiMenu,
  FiSearch,
  FiPlus,
  FiMinus,
  FiMaximize2,
  FiMinimize2,
  FiCompass,
  FiShield,
  FiMapPin,
  FiEdit2,
  FiTrash2,
  FiCrosshair,
  FiX,
  FiNavigation,
  FiUser,
} from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

const LeafletMapContainer = MapContainer as any;
const LeafletTileLayer = TileLayer as any;
const LeafletCircle = Circle as any;
const LeafletMarker = Marker as any;
const LeafletPopup = Popup as any;
const LeafletPolyline = Polyline as any;

// ── World-Class Map Providers (Real World Satellite, Dark Ops, and Street Maps) ──
export const MAP_STYLES: Record<string, {
  id: string;
  name: string;
  icon: string;
  description: string;
  url: string;
  attribution: string;
  overlayUrl?: string | null;
}> = {
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    icon: '🛰️',
    description: 'High-res photorealistic satellite earth view',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  dark: {
    id: 'dark',
    name: 'Dark Ops',
    icon: '🌙',
    description: 'Sleek nocturnal dark canvas with street grid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri Dark Gray Canvas',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
  osm: {
    id: 'osm',
    name: 'Street Map',
    icon: '🌍',
    description: 'Global street map with buildings and campus paths',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    overlayUrl: null,
  },
  streets: {
    id: 'streets',
    name: 'World Streets',
    icon: '🗺️',
    description: 'Crisp vector street cartography',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Street Map',
    overlayUrl: null,
  },
  topo: {
    id: 'topo',
    name: 'Terrain',
    icon: '🏔️',
    description: 'Topographic contour and terrain map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri Topo Map',
    overlayUrl: null,
  },
};

// Custom interactive zoom, fit, checkpoint, and fullscreen controls
function CustomMapControls({
  onResetView,
  onToggleFullscreen,
  isFullscreen,
  onCenterCheckpoint,
  hasCheckpoint,
  checkpointName,
  isLocatingUser,
  hasUserLocation,
}: {
  onResetView: (map: any) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onCenterCheckpoint?: () => void;
  hasCheckpoint?: boolean;
  checkpointName?: string;
  isLocatingUser?: boolean;
  hasUserLocation?: boolean;
}) {
  const map = useMap();
  return (
    <div className="absolute bottom-8 left-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
      <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border-b border-slate-100 dark:border-white/5 active:scale-95"
          title="Zoom In"
        >
          <FiPlus size={18} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors active:scale-95"
          title="Zoom Out"
        >
          <FiMinus size={18} />
        </button>
      </div>

      {/* Compass / User Current Device Location Button */}
      <button
        type="button"
        onClick={() => onResetView(map)}
        className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center group relative"
        title={
          isLocatingUser
            ? 'Detecting your device location...'
            : hasUserLocation
            ? 'Re-center on Your Current Location'
            : 'Show My Current Location (Device GPS)'
        }
      >
        <FiCompass
          size={18}
          className={`${
            isLocatingUser
              ? 'animate-spin text-blue-600 dark:text-blue-400'
              : hasUserLocation
              ? 'text-blue-600 dark:text-blue-400 group-hover:rotate-90'
              : 'group-hover:rotate-90'
          } transition-transform duration-300`}
        />
        {hasUserLocation && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
        )}
      </button>

      {/* Center Checkpoint Button */}
      {hasCheckpoint && onCenterCheckpoint && (
        <button
          type="button"
          onClick={onCenterCheckpoint}
          className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors active:scale-95 flex items-center justify-center group"
          title={`Center on Checkpoint: ${checkpointName || 'Warden Checkpoint'}`}
        >
          <FiShield size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Fullscreen Mode Toggle Button */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center group"
        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'}
      >
        {isFullscreen ? (
          <FiMinimize2 size={18} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
        ) : (
          <FiMaximize2 size={18} className="group-hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  );
}

CustomMapControls.propTypes = {
  onResetView: PropTypes.func.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  onCenterCheckpoint: PropTypes.func,
  hasCheckpoint: PropTypes.bool,
  checkpointName: PropTypes.string,
  isLocatingUser: PropTypes.bool,
  hasUserLocation: PropTypes.bool,
};

// Component to handle map resize whenever the right sidebar opens or collapses, or fullscreen toggles
function MapResizeHandler({ sidebarOpen, isFullscreen }: { sidebarOpen: boolean; isFullscreen?: boolean }) {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [sidebarOpen, isFullscreen, map]);
  return null;
}

MapResizeHandler.propTypes = {
  sidebarOpen: PropTypes.bool.isRequired,
  isFullscreen: PropTypes.bool,
};



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

// Component to dynamically fit markers of active students
function LiveAutoCentering({
  students,
}: {
  students: any[];
}) {
  const map = useMap();
  const initialCenteredRef = useRef(false);

  useEffect(() => {
    if (initialCenteredRef.current) return;

    const validPositions = students
      .filter((s: any) => s.latitude !== 0 && s.longitude !== 0)
      .map((s: any) => [s.latitude, s.longitude] as [number, number]);

    if (validPositions.length > 0) {
      if (validPositions.length === 1) {
        map.flyTo(validPositions[0], 16, { animate: true, duration: 1.2 });
      } else {
        const bounds = L.latLngBounds(validPositions);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true, duration: 1.2 });
      }
      initialCenteredRef.current = true;
    }
  }, [students, map]);

  return null;
}

LiveAutoCentering.propTypes = {
  students: PropTypes.array.isRequired,
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

export interface WardenCheckpoint {
  lat: number;
  lng: number;
  name: string;
  radius: number;
}

// Create custom sharp drop pin for Warden Checkpoint / Gate
function createCheckpointIcon(name: string) {
  const width = 36;
  const height = 48;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 48">
      <defs>
        <filter id="cpt-shadow" x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.45" />
        </filter>
        <linearGradient id="cpt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>

      <!-- Pin Needle Shadow -->
      <ellipse cx="18" cy="46.5" rx="3.5" ry="1.5" fill="#000000" opacity="0.3" />

      <!-- Teardrop Map Pin Body -->
      <path d="M18 2 C9.16 2 2 9.16 2 18 C2 28.2 18 46 18 46 C18 46 34 28.2 34 18 C34 9.16 26.84 2 18 2 Z" 
            fill="url(#cpt-grad)" 
            stroke="#ffffff" 
            stroke-width="2.2" 
            filter="url(#cpt-shadow)" />

      <!-- Inner White Circle -->
      <circle cx="18" cy="18" r="10.5" fill="#ffffff" />

      <!-- Shield / Checkpoint Emblem -->
      <path d="M18 11.5 L13 14 V19.2 C13 22.8 18 25.2 18 25.2 C18 25.2 23 22.8 23 19.2 V14 Z" 
            fill="#0284c7" />
    </svg>`;

  return L.divIcon({
    html: svg,
    className: 'custom-checkpoint-pin',
    iconSize: [width, height],
    iconAnchor: [width / 2, height - 2], // needle point exactly touches coordinates
    popupAnchor: [0, -(height - 4)],
  });
}

// Create custom live device location pin for the logged-in user
function createUserDeviceIcon(name: string, role?: string) {
  const width = 48;
  const height = 54;
  const displayName = name ? (name.split(' ')[0] || name) : 'You';
  const roleName = (role || 'Warden').toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 48 54">
      <defs>
        <filter id="usr-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1e3a8a" flood-opacity="0.45" />
        </filter>
        <linearGradient id="usr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>

      <!-- Animated Pulse Ring at ground tip point (24, 49) -->
      <circle cx="24" cy="49" r="5" fill="#3b82f6" opacity="0.65">
        <animate attributeName="r" values="3;13;13" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;0;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="24" cy="49" rx="4" ry="2" fill="#0f172a" opacity="0.35" />

      <!-- Teardrop Map Pin Body -->
      <path d="M24 4 C14.05 4 6 12.05 6 22 C6 33.5 24 49 24 49 C24 49 42 33.5 42 22 C42 12.05 33.95 4 24 4 Z" 
            fill="url(#usr-grad)" 
            stroke="#ffffff" 
            stroke-width="2.5" 
            filter="url(#usr-shadow)" />

      <!-- Inner Crisp White Badge -->
      <circle cx="24" cy="21" r="11" fill="#ffffff" />

      <!-- User Silhouette in Royal Blue -->
      <circle cx="24" cy="17" r="4.2" fill="#1d4ed8" />
      <path d="M16 27 C16 23.2 19.5 22.5 24 22.5 C28.5 22.5 32 23.2 32 27 Z" fill="#1d4ed8" />

      <!-- Floating "YOU" Pill Tag on top -->
      <rect x="8" y="0" width="32" height="11" rx="5.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.2" />
      <text x="24" y="8" text-anchor="middle" fill="#38bdf8" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="900" letter-spacing="0.5">YOU</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: 'custom-user-device-pin',
    iconSize: [width, height],
    iconAnchor: [24, 49], // needle tip accurately touches coordinates
    popupAnchor: [0, -46],
  });
}

// Map Click Listener for Pin Drop Mode
function MapClickHandler({
  isPinning,
  onPin,
}: {
  isPinning: boolean;
  onPin: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isPinning) {
        onPin(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const getInitialCenter = (): [number, number] => {
  try {
    const raw = localStorage.getItem('warden_checkpoint');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return [parsed.lat, parsed.lng];
      }
    }
  } catch {
    // ignore
  }
  return [13.0827, 80.2707]; // Default campus region
};

export default function Map() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>(getInitialCenter);
  const [, setWsConnected] = useState(false);
  const [routeHistory, setRouteHistory] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'overdue', 'moving'
  const { user } = useAuthStore() as any;
  const { dark } = useThemeStore() as any;
  const [mapStyle, setMapStyle] = useState<string>(() => (dark ? 'dark' : 'streets'));
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  // When changing theme in the header, immediately update the map basemap to match
  useEffect(() => {
    setMapStyle(dark ? 'dark' : 'streets');
  }, [dark]);
  // Fullscreen mode state and handler
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const el = mapWrapperRef.current || document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        (el as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 350);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Live second ticker to show real-time update freshness
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastUpdatedTime]);

  // ── Warden Checkpoint State & Handlers ──
  const [checkpoint, setCheckpoint] = useState<WardenCheckpoint | null>(() => {
    try {
      const raw = localStorage.getItem('warden_checkpoint');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  });
  const [isPinningCheckpoint, setIsPinningCheckpoint] = useState(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [tempCheckpointName, setTempCheckpointName] = useState('Main Security Gate');
  const [tempCheckpointRadius, setTempCheckpointRadius] = useState(150);
  const [locatingDevice, setLocatingDevice] = useState(false);

  // ── Current Logged-in User's Physical Device GPS Location ──
  const [userDeviceLocation, setUserDeviceLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: number;
  } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Sync temp values whenever modal opens or checkpoint changes
  useEffect(() => {
    if (checkpoint) {
      setTempCheckpointName(checkpoint.name || 'Main Security Gate');
      setTempCheckpointRadius(checkpoint.radius || 150);
    }
  }, [isCheckpointModalOpen, checkpoint]);

  // Handler when user clicks on map in pinning mode
  const handlePinDropped = (lat: number, lng: number) => {
    const newCheckpoint: WardenCheckpoint = {
      lat,
      lng,
      name: checkpoint?.name || 'Main Security Gate',
      radius: checkpoint?.radius || 150,
    };
    setCheckpoint(newCheckpoint);
    try {
      localStorage.setItem('warden_checkpoint', JSON.stringify(newCheckpoint));
    } catch {
      // ignore
    }
    setIsPinningCheckpoint(false);
    toastService.success(`Checkpoint pinned at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
  };

  // Handler to center on checkpoint
  const handleCenterCheckpoint = () => {
    if (checkpoint) {
      setFlyTarget([checkpoint.lat, checkpoint.lng]);
      toastService.info(`Centering on ${checkpoint.name}`);
    }
  };

  // Handler to remove checkpoint
  const handleRemoveCheckpoint = () => {
    setCheckpoint(null);
    try {
      localStorage.removeItem('warden_checkpoint');
    } catch {
      // ignore
    }
    toastService.info('Warden checkpoint removed');
  };

  // Handler to save modal details
  const handleSaveCheckpointModal = () => {
    if (!checkpoint) {
      const newCheckpoint: WardenCheckpoint = {
        lat: center[0],
        lng: center[1],
        name: tempCheckpointName.trim() || 'Main Security Gate',
        radius: tempCheckpointRadius,
      };
      setCheckpoint(newCheckpoint);
      try {
        localStorage.setItem('warden_checkpoint', JSON.stringify(newCheckpoint));
      } catch {
        // ignore
      }
    } else {
      const updated: WardenCheckpoint = {
        ...checkpoint,
        name: tempCheckpointName.trim() || 'Main Security Gate',
        radius: tempCheckpointRadius,
      };
      setCheckpoint(updated);
      try {
        localStorage.setItem('warden_checkpoint', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setIsCheckpointModalOpen(false);
    toastService.success('Checkpoint settings saved');
  };

  // Use current physical device location for checkpoint
  const handleUseCurrentDeviceForCheckpoint = () => {
    if (!navigator.geolocation) {
      toastService.error('Geolocation is not supported by your browser');
      return;
    }
    setLocatingDevice(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingDevice(false);
        const { latitude, longitude } = pos.coords;
        const newCheckpoint: WardenCheckpoint = {
          lat: latitude,
          lng: longitude,
          name: tempCheckpointName.trim() || 'Main Security Gate',
          radius: tempCheckpointRadius,
        };
        setCheckpoint(newCheckpoint);
        try {
          localStorage.setItem('warden_checkpoint', JSON.stringify(newCheckpoint));
        } catch {
          // ignore
        }
        setIsCheckpointModalOpen(false);
        setFlyTarget([latitude, longitude]);
        toastService.success(`Checkpoint set to device location: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
      },
      (err) => {
        setLocatingDevice(false);
        toastService.error('Could not get device location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleResetView = (mapInstance: any) => {
    // If device geolocation is not supported
    if (!navigator.geolocation) {
      toastService.error('Geolocation is not supported by your browser');
      if (checkpoint) {
        mapInstance.flyTo([checkpoint.lat, checkpoint.lng], 17, { animate: true, duration: 1.2 });
      } else {
        mapInstance.flyTo(center, 15, { animate: true });
      }
      return;
    }

    // Instant fly if already located once
    if (userDeviceLocation) {
      mapInstance.flyTo([userDeviceLocation.lat, userDeviceLocation.lng], 17, { animate: true, duration: 1.0 });
    }

    setIsLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy, timestamp: Date.now() };
        setUserDeviceLocation(newLoc);
        mapInstance.flyTo([latitude, longitude], 17, { animate: true, duration: 1.2 });
        const name = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'You';
        toastService.success(`Live device location active: ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`);
      },
      (err) => {
        setIsLocatingUser(false);
        if (!userDeviceLocation) {
          toastService.error(`Could not locate device: ${err.message}`);
          if (checkpoint) {
            mapInstance.flyTo([checkpoint.lat, checkpoint.lng], 17, { animate: true });
          } else {
            mapInstance.flyTo(center, 15, { animate: true });
          }
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
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

    // Continuously update active students in real time every 4 seconds
    const intervalId = setInterval(() => {
      fetchActiveStudents(true);
    }, 4000);

    return () => {
      isUnmounting.current = true;
      clearInterval(intervalId);
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
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
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

  const fetchActiveStudents = async (isBackground = false) => {
    try {
      const response = await outpassAPI.getActiveStudents();
      setActiveStudents(response.data);
      if (response.data.length > 0) {
        setLastUpdatedTime(new Date());
      }
      const valid = response.data.find(s => s.latitude !== 0 && s.longitude !== 0);
      if (valid) {
        setCenter([valid.latitude, valid.longitude]);
      }
    } catch (err) {
      if (!isBackground) {
        const errorMsg = getErrorMessage(err);
        console.error('Failed to fetch active students:', errorMsg);
        toastService.error(errorMsg);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
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
            setLastUpdatedTime(new Date());
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
            setLastUpdatedTime(new Date());
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
    <div ref={mapWrapperRef} className="flex flex-row w-full h-full overflow-hidden bg-slate-900 relative">
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

      {/* ── MAP CONTAINER (LEFT) ── */}
      <div className="flex-1 relative z-10 w-full h-full min-w-0">
        {/* Floating Toggle Button (Appears on the top RIGHT when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 right-6 z-[1000] p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl hover:scale-105 active:scale-95 transition-all group/toggle text-blue-600 dark:text-blue-400 border border-white/20 dark:border-white/10 rounded-2xl flex items-center gap-2"
            title="Open Active Ops Sidebar"
          >
            <FiMenu size={22} className="group-hover/toggle:rotate-180 transition-transform duration-500" />
            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Active Ops</span>
          </button>
        )}

        {/* Floating Map Controls & Style Switcher on Top Left */}
        <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2.5 max-w-[calc(100vw-5rem)] pointer-events-auto">
          {/* Map Layer Switcher */}
          <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex items-center gap-1 overflow-x-auto max-w-full">
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => setMapStyle(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  mapStyle === key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title={style.description}
              >
                <span>{style.icon}</span>
                <span>{style.name}</span>
              </button>
            ))}
          </div>

          {/* Status Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Real-time Student Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">ACTIVE RADAR</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-900 dark:text-white font-extrabold">{studentsWithColor.length} Active Students</span>
            </div>

            {/* Checkpoint Status Badge */}
            {checkpoint ? (
              <button
                type="button"
                onClick={handleCenterCheckpoint}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-cyan-500/30 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-all active:scale-95 group"
                title="Click to center on Checkpoint"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="font-extrabold text-cyan-600 dark:text-cyan-400">CHECKPOINT</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[130px]">{checkpoint.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsPinningCheckpoint(true);
                  toastService.info('Click anywhere on the map to place Warden Checkpoint');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-dashed border-cyan-500/40 text-xs font-extrabold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-all active:scale-95"
              >
                <FiMapPin size={13} />
                <span>+ Pin Checkpoint</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Pinning Mode Active Banner */}
        {isPinningCheckpoint && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 bg-cyan-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border border-cyan-300/40 animate-pulse pointer-events-auto">
            <FiCrosshair className="animate-spin" size={18} />
            <span className="text-xs font-black uppercase tracking-wider">
              Click anywhere on map to drop Warden Checkpoint
            </span>
            <button
              type="button"
              onClick={() => setIsPinningCheckpoint(false)}
              className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <LeafletMapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className={`relative z-10 ${isPinningCheckpoint ? '!cursor-crosshair' : ''}`}
          zoomControl={false}
        >
          <MapClickHandler isPinning={isPinningCheckpoint} onPin={handlePinDropped} />
          <LiveAutoCentering students={studentsWithColor} />
          {flyTarget && <FlyToStudent target={flyTarget} />}
          <MapResizeHandler sidebarOpen={sidebarOpen} isFullscreen={isFullscreen} />
          <CustomMapControls
            onResetView={handleResetView}
            onToggleFullscreen={handleToggleFullscreen}
            isFullscreen={isFullscreen}
            hasCheckpoint={!!checkpoint}
            checkpointName={checkpoint?.name}
            onCenterCheckpoint={handleCenterCheckpoint}
            isLocatingUser={isLocatingUser}
            hasUserLocation={!!userDeviceLocation}
          />

          {/* Primary Base Map Layer */}
          <LeafletTileLayer
            key={`base-${mapStyle}`}
            url={MAP_STYLES[mapStyle].url}
            attribution={MAP_STYLES[mapStyle].attribution}
            maxZoom={19}
          />

          {/* Satellite Place Names & Streets Overlay if enabled */}
          {MAP_STYLES[mapStyle].overlayUrl && (
            <LeafletTileLayer
              key={`overlay-${mapStyle}`}
              url={MAP_STYLES[mapStyle].overlayUrl}
              attribution="&copy; Esri World Boundaries and Places"
              maxZoom={19}
            />
          )}

          {/* Render geometry (lines, circles) */}
          {studentsWithColor.map((student) => {
            if (student.latitude === 0 && student.longitude === 0) return null;
            const isSelected = selectedStudentId === student.student_id;

            return (
              <div key={`geom-${student.student_id}`}>
                {isSelected && routeHistory[student.outpass_request_id]?.length > 0 && (
                  <LeafletPolyline
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
                  <LeafletCircle
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
              <LeafletMarker
                key={`marker-${student.student_id}`}
                position={[student.latitude, student.longitude]}
                icon={icon}
                eventHandlers={{ click: () => handleSelectStudent(student) }}
              >
                <LeafletPopup minWidth={300} className="custom-glass-popup">
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
                </LeafletPopup>
              </LeafletMarker>
            );
          })}

          {/* Warden Checkpoint Marker (Only Pin, No Border Circle) */}
          {checkpoint && (
            <LeafletMarker
              position={[checkpoint.lat, checkpoint.lng]}
              icon={createCheckpointIcon(checkpoint.name)}
            >
              <LeafletPopup minWidth={280} className="custom-glass-popup">
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-white/10">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                      <FiShield size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                        Warden Checkpoint
                      </span>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                        {checkpoint.name}
                      </h4>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400 font-mono">
                      <span>Coordinates:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {checkpoint.lat.toFixed(5)}°, {checkpoint.lng.toFixed(5)}°
                      </span>
                    </div>
                  </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCheckpointModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                      >
                        <FiEdit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPinningCheckpoint(true);
                          toastService.info('Click anywhere on the map to relocate checkpoint');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-600 dark:text-cyan-400 transition-colors"
                      >
                        <FiCrosshair size={13} /> Re-Pin
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveCheckpoint}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                        title="Remove Checkpoint"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </LeafletPopup>
              </LeafletMarker>
          )}

          {/* Current Logged-in User's Live Device Location Marker */}
          {userDeviceLocation && (
            <>
              {userDeviceLocation.accuracy && (
                <LeafletCircle
                  center={[userDeviceLocation.lat, userDeviceLocation.lng]}
                  radius={Math.min(userDeviceLocation.accuracy, 200)}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 1.5,
                    dashArray: '4, 4',
                  }}
                />
              )}
              <LeafletMarker
                position={[userDeviceLocation.lat, userDeviceLocation.lng]}
                icon={createUserDeviceIcon(
                  user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'You',
                  user?.role || 'Warden'
                )}
              >
                <LeafletPopup minWidth={280} className="custom-glass-popup">
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-white/10">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <FiUser size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            Current Device Location
                          </span>
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active on this device" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                          {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Logged-in Warden'}
                        </h4>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-500 dark:text-gray-400 font-mono">
                        <span>Role:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">
                          {user?.role || 'Warden'}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500 dark:text-gray-400 font-mono">
                        <span>Device GPS:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {userDeviceLocation.lat.toFixed(5)}°, {userDeviceLocation.lng.toFixed(5)}°
                        </span>
                      </div>
                      {userDeviceLocation.accuracy && (
                        <div className="flex justify-between text-gray-500 dark:text-gray-400 font-mono">
                          <span>Accuracy:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ±{Math.round(userDeviceLocation.accuracy)}m
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newCheckpoint: WardenCheckpoint = {
                            lat: userDeviceLocation.lat,
                            lng: userDeviceLocation.lng,
                            name: `${user?.first_name || user?.name || 'Warden'} Station`,
                            radius: 100,
                          };
                          setCheckpoint(newCheckpoint);
                          try {
                            localStorage.setItem('warden_checkpoint', JSON.stringify(newCheckpoint));
                          } catch {}
                          toastService.success('Checkpoint set to your current device location');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-md active:scale-95"
                      >
                        <FiShield size={13} /> Set as Checkpoint
                      </button>
                    </div>
                  </div>
                </LeafletPopup>
              </LeafletMarker>
            </>
          )}
        </LeafletMapContainer>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div
        className={`flex-shrink-0 bg-white/85 dark:bg-[#151921]/90 backdrop-blur-3xl border-l border-gray-200 dark:border-white/10 shadow-2xl z-20 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarOpen ? 'w-80 sm:w-96 relative translate-x-0' : 'w-0 translate-x-full overflow-hidden'
        }`}
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
            title="Collapse Ops Panel"
          >
            <FiMenu size={20} />
          </button>
        </div>

        {/* Connection status */}
        <div className="px-6 py-4 space-y-3">
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

          {/* Warden Checkpoint Intelligence Card */}
          <div className="premium-card glass p-4 bg-gray-50/50 dark:bg-white/5 border border-cyan-500/20 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <FiShield size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Warden Checkpoint
                  </span>
                  <span className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[160px]">
                    {checkpoint ? checkpoint.name : 'No Checkpoint Set'}
                  </span>
                </div>
              </div>
              {checkpoint ? (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  PINNED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  UNSET
                </span>
              )}
            </div>

            {checkpoint ? (
              <div className="space-y-3">
                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FiMapPin size={12} className="text-cyan-500" />
                    {checkpoint.lat.toFixed(5)}°, {checkpoint.lng.toFixed(5)}°
                  </span>
                  <button
                    type="button"
                    onClick={handleCenterCheckpoint}
                    className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Locate
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleCenterCheckpoint}
                    className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-white px-2 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-500/20 hover:bg-cyan-600"
                  >
                    <FiNavigation size={12} /> Center
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinningCheckpoint(true);
                      toastService.info('Click anywhere on the map to relocate checkpoint');
                    }}
                    className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-2 py-2 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95"
                  >
                    <FiCrosshair size={12} /> Re-Pin
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCheckpointModalOpen(true)}
                    className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-2 py-2 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95"
                  >
                    <FiEdit2 size={12} /> Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Drop a live security post or campus gate pin anywhere on the map to establish perimeter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinningCheckpoint(true);
                    toastService.info('Click anywhere on the map to place your checkpoint');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-black tracking-widest uppercase bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/25"
                >
                  <FiMapPin size={14} /> Pin Checkpoint On Map
                </button>
              </div>
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
              className="w-full !pl-11 pr-4 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
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
                      {student.latitude !== 0 && student.longitude !== 0 ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{student.latitude.toFixed(5)}°, {student.longitude.toFixed(5)}°</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-slate-400 italic">
                          Awaiting GPS broadcast
                        </div>
                      )}
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

      {/* ── WARDEN CHECKPOINT CONFIGURATION MODAL ── */}
      {isCheckpointModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500">
                  <FiShield size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Warden Checkpoint Config
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customize security post name and zone radius
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckpointModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Checkpoint Name / Label
                </label>
                <input
                  type="text"
                  value={tempCheckpointName}
                  onChange={(e) => setTempCheckpointName(e.target.value)}
                  placeholder="e.g. Main Campus Gate"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Main Security Gate', 'Hostel Block Gate', 'North Checkpoint', 'Campus Exit'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempCheckpointName(preset)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-500 text-gray-600 dark:text-gray-400 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS location option */}
              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleUseCurrentDeviceForCheckpoint}
                  disabled={locatingDevice}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-cyan-500 text-xs font-bold text-gray-700 dark:text-gray-200 transition-all hover:bg-cyan-500/5 disabled:opacity-50"
                >
                  <FiNavigation size={14} className="text-cyan-500" />
                  {locatingDevice ? 'Detecting Device GPS...' : 'Use My Current GPS Position'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckpointModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCheckpointModal}
                className="flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
              >
                Save Checkpoint
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
