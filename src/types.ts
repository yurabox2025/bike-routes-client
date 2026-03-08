export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  disabled?: boolean;
}

export interface LineStringGeoJson {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteItem {
  id: string;
  name: string;
  createdBy: string;
  visibility: 'public' | 'private';
  rating?: number | null;
  participantUserIds?: string[];
  gpxStorage?: {
    provider: 'yadisk' | 'local';
    pathOrUrl: string;
  };
  routeLineGeoJson: LineStringGeoJson;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  participantUserIds: string[];
  startedAt: string;
  distanceMeters: number;
  durationSeconds?: number;
  polylineGeoJson: LineStringGeoJson;
  routeId: string | null;
  createdAt: string;
  gpxStorage: {
    provider: 'yadisk' | 'local';
    pathOrUrl: string;
  };
}

export interface RouteCompletion {
  activityId: string;
  userId: string;
  userName: string;
  startedAt: string;
}
