import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { RouteItem } from '../types';

type MapScope = 'public' | 'private';

const ROUTE_COLORS = ['#0d6efd', '#20c997', '#fd7e14', '#dc3545', '#6f42c1', '#198754', '#e83e8c', '#0dcaf0', '#795548'];

function routeColorById(routeId: string): string {
  let hash = 0;
  for (let index = 0; index < routeId.length; index += 1) {
    hash = (hash * 31 + routeId.charCodeAt(index)) >>> 0;
  }
  return ROUTE_COLORS[hash % ROUTE_COLORS.length];
}

export function AllRoutesMapPage() {
  const [scope, setScope] = useState<MapScope>('public');
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsMapLoading(true);
      setError(null);
      try {
        const routesRes = await apiFetch<{ routes: RouteItem[] }>(`/api/routes?scope=${scope}`);
        setRoutes(routesRes.routes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setIsMapLoading(false);
      }
    }

    void load();
  }, [scope]);

  const overlays = useMemo(
    () => [
      ...(showRouteLines
        ? routes.map((route) => ({
            id: `route-${route.id}`,
            line: route.routeLineGeoJson,
            color: routeColorById(route.id)
          }))
        : [])
    ],
    [routes, showRouteLines, scope]
  );

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">Карта маршрутов</h1>
        <Link className="btn btn-outline-primary" to="/routes-list">
          К списку маршрутов
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="btn-group" role="group" aria-label="Route scope switcher">
                <button
                  type="button"
                  className={`btn btn-sm ${scope === 'public' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setScope('public')}
                  disabled={isMapLoading}
                >
                  {isMapLoading && scope === 'public' ? 'Загрузка...' : 'Общие маршруты'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${scope === 'private' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setScope('private')}
                  disabled={isMapLoading}
                >
                  {isMapLoading && scope === 'private' ? 'Загрузка...' : 'Мои маршруты'}
                </button>
              </div>
              <span className={`badge ${scope === 'public' ? 'text-bg-primary' : 'text-bg-dark'}`}>Маршруты: {routes.length}</span>
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
