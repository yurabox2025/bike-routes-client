import type { LineStringGeoJson } from './types';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatDistanceMeters(value: number): string {
  return `${(value / 1000).toFixed(2)} km`;
}

export function lineDistanceMeters(coords: [number, number][]): number {
  if (coords.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const [lon1, lat1] = coords[index - 1];
    const [lon2, lat2] = coords[index];

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const dPhi = toRadians(lat2 - lat1);
    const dLambda = toRadians(lon2 - lon1);

    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += EARTH_RADIUS_METERS * c;
  }

  return total;
}

export async function parseGpxPreview(file: File): Promise<LineStringGeoJson> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const points = Array.from(doc.getElementsByTagName('trkpt'));

  const coordinates: [number, number][] = points
    .map((node) => {
      const lat = Number(node.getAttribute('lat'));
      const lon = Number(node.getAttribute('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }
      return [lon, lat] as [number, number];
    })
    .filter((item): item is [number, number] => item !== null);

  if (coordinates.length < 2) {
    throw new Error('GPX трек содержит меньше двух валидных точек');
  }

  return {
    type: 'LineString',
    coordinates
  };
}
