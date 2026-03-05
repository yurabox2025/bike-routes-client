import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { Activity, RouteItem } from '../types';

export function AllRoutesMapPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [activitiesRes, routesRes] = await Promise.all([
          apiFetch<{ activities: Activity[] }>('/api/activities'),
          apiFetch<{ routes: RouteItem[] }>('/api/routes')
        ]);

        setActivities(activitiesRes.activities);
        setRoutes(routesRes.routes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      }
    }

    void load();
  }, []);

  const completedActivities = useMemo(
    () => activities.filter((activity) => activity.routeId),
    [activities]
  );

  const overlays = useMemo(
    () => [
      ...completedActivities.map((activity) => ({
        id: `activity-${activity.id}`,
        line: activity.polylineGeoJson,
        color: '#e55353'
      })),
      ...(showRouteLines
        ? routes.map((route) => ({
            id: `route-${route.id}`,
            line: route.routeLineGeoJson,
            color: '#0d6efd'
          }))
        : [])
    ],
    [completedActivities, routes, showRouteLines]
  );

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">Общая карта прохождений</h1>
        <Link className="btn btn-outline-primary" to="/">
          К списку маршрутов
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
            <div className="d-flex flex-wrap gap-3">
              <span className="badge text-bg-danger">Треки прохождений: {completedActivities.length}</span>
              <span className="badge text-bg-primary">Маршруты: {routes.length}</span>
            </div>
            <div className="form-check m-0">
              <input
                id="showRouteLines"
                className="form-check-input"
                type="checkbox"
                checked={showRouteLines}
                onChange={(event) => setShowRouteLines(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="showRouteLines">
                Показывать линии маршрутов
              </label>
            </div>
          </div>
          <MapView overlays={overlays} height={620} />
        </div>
      </div>
    </div>
  );
}
