/**
 * @file DeviceInventoryMap.tsx
 * @description React-Leaflet map for Device Inventory: OSM tiles, clustered markers, free pan/zoom.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { DeviceMapMarker } from '../../services/DeviceInventory';

type DeviceInventoryMapProps = {
  markers: DeviceMapMarker[];
  loading?: boolean;
  autoFit?: boolean;
  fitToken?: string;
  resetViewWhenIdle?: boolean;
  /** When set, all points/clusters use this color (clone brand theme). Original map keeps status colors. */
  pointColor?: string;
  /** Clone India view: ignore out-of-country coordinates when fitting/plotting. */
  clampToIndia?: boolean;
  onMarkerSelect: (id: string) => void;
  leftOverlay?: React.ReactNode;
  /** Page scroll vs map zoom. Original keeps wheel zoom. */
  scrollWheelZoom?: boolean;
  zoomControlPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
};

type MapStatus = 'active' | 'pending' | 'inactive';

const INDIA_CENTER: [number, number] = [22.5, 79];
const INDIA_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68],
  [37.5, 97.5],
];
const STATUS_COLOR: Record<MapStatus, string> = {
  active: '#22c55e',
  pending: '#f59e0b',
  inactive: '#fb7185',
};

function isInsideIndia(marker: DeviceMapMarker): boolean {
  return (
    marker.latitude >= INDIA_VIEW_BOUNDS[0][0] &&
    marker.latitude <= INDIA_VIEW_BOUNDS[1][0] &&
    marker.longitude >= INDIA_VIEW_BOUNDS[0][1] &&
    marker.longitude <= INDIA_VIEW_BOUNDS[1][1]
  );
}

function mapStatus(status?: string): MapStatus {
  const key = status?.trim().toLowerCase() || '';
  if (['pending', 'upcoming', 'scheduled', 'in progress', 'in-progress'].includes(key)) {
    return 'pending';
  }
  if (['inactive', 'offline', 'damaged', 'broken', 'down', 'faulty'].includes(key)) {
    return 'inactive';
  }
  return 'active';
}

function pinIcon(count: number, color: string, size: number = 32): L.DivIcon {
  const width = size;
  const height = Math.round(size * 1.5);
  const fontSize = count > 99 ? 8 : count > 9 ? 9 : 11;
  const label = count > 999 ? '999+' : String(count);
  return L.divIcon({
    className: 'inventory-pin-marker',
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 8],
    html: `<div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">
      <svg viewBox="0 0 24 36" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="display:block">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9.5 12 24 12 24s12-14.5 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="7.2" fill="#fff"/>
      </svg>
      <span style="
        position:absolute;left:50%;top:33.33%;transform:translate(-50%,-50%);
        color:${color};font:700 ${fontSize}px/1 Arial,sans-serif;white-space:nowrap;
        pointer-events:none;
      ">${label}</span>
    </div>`,
  });
}

function statusIcon(status?: string, pointColor?: string): L.DivIcon {
  const color = pointColor || STATUS_COLOR[mapStatus(status)];
  return pinIcon(1, color, 30);
}

function fitMapToIndia(map: L.Map, markers: DeviceMapMarker[]) {
  map.invalidateSize();
  if (markers.length > 0) {
    const bounds = L.latLngBounds(
      markers.map((marker) => [marker.latitude, marker.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.12), {
      maxZoom: 6,
      animate: false,
    });
    return;
  }
  map.fitBounds(L.latLngBounds(INDIA_VIEW_BOUNDS), {
    padding: [28, 28],
    maxZoom: 5,
    animate: false,
  });
}

function ScrollWheelZoomGate({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (enabled) {
      map.scrollWheelZoom.enable();
      return;
    }
    map.scrollWheelZoom.disable();
  }, [enabled, map]);

  return null;
}

function InvalidateMapSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      window.setTimeout(() => map.invalidateSize(), 80);
    };
    document.addEventListener('fullscreenchange', refresh);
    window.addEventListener('resize', refresh);
    refresh();
    return () => {
      document.removeEventListener('fullscreenchange', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [map]);

  return null;
}

function AutoFitToFilteredMarkers({
  markers,
  enabled,
  fitToken,
  resetToIdle,
}: {
  markers: DeviceMapMarker[];
  enabled: boolean;
  fitToken?: string;
  resetToIdle?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (!enabled) {
        if (resetToIdle) {
          fitMapToIndia(map, markers);
        }
        return;
      }

      if (markers.length === 0) {
        if (resetToIdle) {
          fitMapToIndia(map, []);
        }
        return;
      }

      const bounds = L.latLngBounds(
        markers.map((marker) => [marker.latitude, marker.longitude] as [number, number])
      );
      map.fitBounds(bounds.pad(0.18), {
        maxZoom: 14,
        animate: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, fitToken, map, markers, resetToIdle]);

  return null;
}

function InventoryMarkerCluster({
  markers,
  onMarkerSelect,
  pointColor,
}: {
  markers: DeviceMapMarker[];
  onMarkerSelect: (id: string) => void;
  pointColor?: string;
}) {
  const map = useMap();
  const onMarkerSelectRef = useRef(onMarkerSelect);
  onMarkerSelectRef.current = onMarkerSelect;

  useEffect(() => {
    const clusterColor = pointColor || '#22c55e';
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 56,
      showCoverageOnHover: false,
      spiderfyOnEveryZoom: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return pinIcon(count, clusterColor, count > 99 ? 40 : 36);
      },
    });

    markers.forEach((item) => {
      const layer = L.marker([item.latitude, item.longitude], {
        icon: statusIcon(item.status, pointColor),
      });
      const status = mapStatus(item.status);
      layer.bindTooltip(
        `<strong>Device</strong><br/>${item.category || 'Inventory'}${item.status ? ` · ${item.status}` : ''}`,
        { sticky: true, direction: 'top', opacity: 0.95 }
      );
      const actionColor = pointColor || '#007b83';
      layer.bindPopup(
        `<div style="min-width:160px">
          <p style="margin:0 0 6px;font-weight:600">Device ${item.id}</p>
          <p style="margin:0 0 4px;font-size:12px">Status: ${status}</p>
          <p style="margin:0 0 8px;font-size:12px">Category: ${item.category || '-'}</p>
          <button type="button" data-device-id="${item.id}" style="
            border:0;background:${actionColor};color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:600;
          ">View Details</button>
        </div>`
      );
      layer.on('popupopen', (event) => {
        const popupElement = event.popup.getElement();
        const button = popupElement?.querySelector('button[data-device-id]');
        button?.addEventListener('click', (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          onMarkerSelectRef.current(item.id);
        });
      });
      clusterGroup.addLayer(layer);
    });

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
    };
  }, [map, markers, pointColor]);

  return null;
}

const DeviceInventoryMap: React.FC<DeviceInventoryMapProps> = ({
  markers,
  loading = false,
  autoFit = false,
  fitToken,
  resetViewWhenIdle = false,
  pointColor,
  clampToIndia = false,
  onMarkerSelect,
  leftOverlay,
  scrollWheelZoom = true,
  zoomControlPosition,
}) => {
  const mapRootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const node = mapRootRef.current;
      setIsFullscreen(Boolean(node && document.fullscreenElement === node));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const node = mapRootRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen();
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      await node.requestFullscreen();
    } catch {
      setIsFullscreen((previous) => !previous);
    }
  }, []);
  const validMarkers = useMemo(
    () => {
      const withCoords = markers.filter(
        (marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude)
      );
      if (!clampToIndia) return withCoords;
      const inIndia = withCoords.filter(isInsideIndia);
      return inIndia.length ? inIndia : withCoords;
    },
    [clampToIndia, markers]
  );

  return (
    <div
      ref={mapRootRef}
      className={`inventory-map relative z-0 isolate overflow-hidden border border-gray-200 bg-[#eef6f6] ${
        isFullscreen
          ? 'fixed inset-0 z-[5000] h-screen min-h-screen rounded-none'
          : 'min-h-[520px] rounded-lg'
      }`}
    >
      <div className={isFullscreen ? 'h-full min-h-full w-full' : 'h-[520px] min-h-[520px] w-full'}>
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          minZoom={2}
          maxZoom={18}
          scrollWheelZoom={scrollWheelZoom}
          dragging
          doubleClickZoom
          zoomControl={false}
          className="h-full w-full !z-0"
          worldCopyJump
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position={zoomControlPosition || (leftOverlay ? 'topright' : 'topleft')} />
          <ScrollWheelZoomGate enabled={scrollWheelZoom || isFullscreen} />
          <InvalidateMapSizeOnResize />
          <AutoFitToFilteredMarkers
            markers={validMarkers}
            enabled={autoFit}
            fitToken={fitToken}
            resetToIdle={resetViewWhenIdle}
          />
          <InventoryMarkerCluster
            markers={validMarkers}
            onMarkerSelect={onMarkerSelect}
            pointColor={pointColor}
          />
        </MapContainer>
      </div>

      {leftOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-[2000] overflow-hidden">
          {leftOverlay}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void toggleFullscreen();
        }}
        aria-label={isFullscreen ? 'Exit full screen' : 'View map full screen'}
        className={`pointer-events-auto absolute z-[2010] inline-flex h-[30px] w-[30px] items-center justify-center rounded border border-gray-300 bg-white p-0 text-gray-700 shadow-sm hover:bg-gray-50 ${
          leftOverlay || zoomControlPosition === 'topright'
            ? 'right-[10px] top-[82px]'
            : 'right-3 top-3'
        }`}
        style={{ backgroundColor: '#ffffff', padding: 0 }}
      >
        {isFullscreen ? (
          <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
      </button>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[2] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 shadow-sm">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Map legend
        </p>
        <ul className="space-y-1 text-xs text-gray-700">
          {pointColor ? (
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pointColor }} />
              Inventory locations
            </li>
          ) : (
            <>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            Active
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Pending
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fb7185]" />
            Inactive
          </li>
            </>
          )}
        </ul>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-[2] rounded-md bg-white/80 px-2 py-1 text-[10px] text-gray-500">
        {loading
          ? 'Updating Device Inventory map…'
          : `${validMarkers.length.toLocaleString()} inventory devices`}
      </div>
    </div>
  );
};

export default DeviceInventoryMap;
