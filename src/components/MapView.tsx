import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Fragment } from 'react';
import type { LineStringGeoJson } from '../types';
import 'leaflet/dist/leaflet.css';

interface Overlay {
  id: string;
  line: LineStringGeoJson;
  label?: string;
  subtitle?: string;
  mobileSubtitle?: string;
  tooltipLines?: string[];
  color?: string;
  weight?: number;
  opacity?: number;
  selected?: boolean;
}

interface Props {
  route?: LineStringGeoJson;
  overlays?: Overlay[];
  height?: number;
  onOverlaySelect?: (overlayId: string) => void;
  fitBoundsToken?: number;
  resetViewToken?: number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

function toLatLngs(line?: LineStringGeoJson): [number, number][] {
  if (!line) {
    return [];
  }
  return line.coordinates.map(([lon, lat]) => [lat, lon]);
}

function AttributionPrefix() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix('🇷🇺 <a href="https://leafletjs.com">Leaflet</a>');
  }, [map]);

  return null;
}

function MapZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoom(map.getZoom());
    }
  });

  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);

  return null;
}

function ViewController({
  route,
  overlays,
  fitBoundsToken,
  resetViewToken,
  defaultCenter,
  defaultZoom
}: {
  route?: LineStringGeoJson;
  overlays: Overlay[];
  fitBoundsToken: number;
  resetViewToken: number;
  defaultCenter: [number, number];
  defaultZoom: number;
}) {
  const map = useMap();
  const appliedFitTokenRef = useRef(0);
  const appliedResetTokenRef = useRef(0);

  useEffect(() => {
    if (fitBoundsToken <= 0 || fitBoundsToken === appliedFitTokenRef.current) {
      return;
    }
    appliedFitTokenRef.current = fitBoundsToken;

    const bounds = L.latLngBounds([]);
    for (const point of toLatLngs(route)) {
      bounds.extend(point);
    }
    for (const overlay of overlays) {
      for (const point of toLatLngs(overlay.line)) {
        bounds.extend(point);
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [fitBoundsToken, map, overlays, route]);

  useEffect(() => {
    if (resetViewToken <= 0 || resetViewToken === appliedResetTokenRef.current) {
      return;
    }
    appliedResetTokenRef.current = resetViewToken;
    map.setView(defaultCenter, defaultZoom);
  }, [defaultCenter, defaultZoom, map, resetViewToken]);

  return null;
}

function simplifyByZoom(latLngs: [number, number][], zoom: number): [number, number][] {
  if (latLngs.length < 3) {
    return latLngs;
  }

  let stride = 1;
  if (zoom < 8) {
    stride = 10;
  } else if (zoom < 10) {
    stride = 6;
  } else if (zoom < 12) {
    stride = 3;
  }

  if (stride === 1) {
    return latLngs;
  }

  const simplified: [number, number][] = [latLngs[0]];
  for (let index = stride; index < latLngs.length - 1; index += stride) {
    simplified.push(latLngs[index]);
  }
  simplified.push(latLngs[latLngs.length - 1]);
  return simplified;
}

export function MapView({
  route,
  overlays = [],
  height = 420,
  onOverlaySelect,
  fitBoundsToken = 0,
  resetViewToken = 0,
  defaultCenter = [55.751244, 37.618423],
  defaultZoom = 10
}: Props) {
  const routeLatLngs = toLatLngs(route);
  const firstOverlayLatLngs = overlays.length > 0 ? toLatLngs(overlays[0].line) : [];
  const center = routeLatLngs[0] ?? firstOverlayLatLngs[0] ?? defaultCenter;
  const [zoom, setZoom] = useState(defaultZoom);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(max-width: 767.98px)');
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const preparedOverlays = useMemo(
    () =>
      overlays.map((item) => ({
        ...item,
        latLngs: simplifyByZoom(toLatLngs(item.line), zoom)
      })),
    [overlays, zoom]
  );

  return (
    <MapContainer center={center} zoom={defaultZoom} style={{ height: `${height}px`, width: '100%' }}>
      <AttributionPrefix />
      <MapZoomTracker onZoom={setZoom} />
      <ViewController
        route={route}
        overlays={overlays}
        fitBoundsToken={fitBoundsToken}
        resetViewToken={resetViewToken}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLatLngs.length > 1 && <Polyline positions={routeLatLngs} color="#2f6fed" weight={5} />}
      {preparedOverlays.map((item) => {
        if (item.latLngs.length < 2) {
          return null;
        }
        const baseWeight = item.weight ?? (item.selected ? 5 : 3);
        const baseOpacity = item.opacity ?? (item.selected ? 1 : 0.7);
        return (
          <Fragment key={`${item.id}-group`}>
            <Polyline
              key={`${item.id}-halo`}
              positions={item.latLngs}
              color="#1f2937"
              weight={baseWeight + 2}
              opacity={Math.min(1, baseOpacity + 0.2)}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              key={item.id}
              positions={item.latLngs}
              color={item.color ?? '#e95157'}
              weight={baseWeight}
              opacity={baseOpacity}
              lineCap="round"
              lineJoin="round"
              eventHandlers={{
                click: () => onOverlaySelect?.(item.id)
              }}
            >
              {(item.label || item.subtitle) && (
                <Tooltip direction="top" sticky>
                  {item.label && <div><strong>{item.label}</strong></div>}
                  {(isMobile ? item.mobileSubtitle ?? item.subtitle : item.subtitle) && (
                    <div>{isMobile ? item.mobileSubtitle ?? item.subtitle : item.subtitle}</div>
                  )}
                  {!isMobile &&
                    item.tooltipLines?.map((line) => (
                      <div key={`${item.id}-${line}`}>{line}</div>
                    ))}
                </Tooltip>
              )}
            </Polyline>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
