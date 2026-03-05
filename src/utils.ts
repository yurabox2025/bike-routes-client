import type { LineStringGeoJson } from './types';

export function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatDistanceMeters(value: number): string {
  return `${(value / 1000).toFixed(2)} km`;
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
