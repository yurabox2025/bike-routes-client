import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import type { LineStringGeoJson } from '../types';
import 'leaflet/dist/leaflet.css';

interface Overlay {
  id: string;
  line: LineStringGeoJson;
  color?: string;
}

interface Props {
  route?: LineStringGeoJson;
  overlays?: Overlay[];
  height?: number;
}

function toLatLngs(line?: LineStringGeoJson): [number, number][] {
  if (!line) {
    return [];
  }
  return line.coordinates.map(([lon, lat]) => [lat, lon]);
}

export function MapView({ route, overlays = [], height = 420 }: Props) {
  const routeLatLngs = toLatLngs(route);
  const firstOverlayLatLngs = overlays.length > 0 ? toLatLngs(overlays[0].line) : [];
  const center = routeLatLngs[0] ?? firstOverlayLatLngs[0] ?? [55.751244, 37.618423];

  return (
    <MapContainer center={center} zoom={10} style={{ height: `${height}px`, width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLatLngs.length > 1 && <Polyline positions={routeLatLngs} color="#2f6fed" weight={5} />}
      {overlays.map((item) => {
        const overlayLatLngs = toLatLngs(item.line);
        if (overlayLatLngs.length < 2) {
          return null;
        }
        return <Polyline key={item.id} positions={overlayLatLngs} color={item.color ?? '#e95157'} weight={3} opacity={0.8} />;
      })}
    </MapContainer>
  );
}
