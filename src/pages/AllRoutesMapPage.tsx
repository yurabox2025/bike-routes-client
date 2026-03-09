import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { RouteItem, User } from '../types';
import { formatDate, formatDistanceMeters, formatElevationMeters, lineDistanceMeters } from '../utils';

type MapScope = 'public' | 'private';

const ROUTE_COLORS = ['#ff1744', '#00b0ff', '#00e676', '#ff9100', '#d500f9', '#ffd600', '#00e5ff', '#76ff03', '#ff4081'];

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
  const [users, setUsers] = useState<User[]>([]);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fitBoundsToken, setFitBoundsToken] = useState(0);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsMapLoading(true);
      setError(null);
      try {
        const [routesRes, usersRes] = await Promise.all([
          apiFetch<{ routes: RouteItem[] }>(`/api/routes?scope=${scope}`),
          apiFetch<{ users: User[] }>('/api/users')
        ]);
        setRoutes(routesRes.routes);
        setUsers(usersRes.users);
        setSelectedRouteId((prev) => (prev && routesRes.routes.some((route) => route.id === prev) ? prev : null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setIsMapLoading(false);
      }
    }

    void load();
  }, [scope]);

  const sortedRoutes = useMemo(
    () =>
      [...routes].sort((a, b) => {
        const aTs = new Date(a.createdAt).getTime();
        const bTs = new Date(b.createdAt).getTime();
        return bTs - aTs;
      }),
    [routes]
  );

  const overlays = useMemo(
    () =>
      showRouteLines
        ? sortedRoutes.map((route) => {
            const creatorName = users.find((user) => user.id === route.createdBy)?.name ?? 'Unknown';
            const overlayId = `route-${route.id}`;
            const mobileDate = new Date(route.createdAt).toLocaleDateString();
            return {
              id: overlayId,
              line: route.routeLineGeoJson,
              color: routeColorById(route.id),
              label: route.name,
              mobileSubtitle: `${formatDistanceMeters(lineDistanceMeters(route.routeLineGeoJson.coordinates))} · Набор ${formatElevationMeters(route.elevationGainMeters)} · ${mobileDate}`,
              subtitle: `${formatDistanceMeters(lineDistanceMeters(route.routeLineGeoJson.coordinates))} · ${formatDate(route.createdAt)} · ${creatorName}`,
              tooltipLines: [
                `Видимость: ${route.visibility === 'private' ? 'Приватный' : 'Публичный'}`,
                `Рейтинг: ${route.rating ? `${route.rating}/10` : 'не задан'}`,
                `Набор: ${formatElevationMeters(route.elevationGainMeters)} · Сброс: ${formatElevationMeters(route.elevationLossMeters)}`
              ],
              selected: selectedRouteId === route.id,
              weight: selectedRouteId === route.id ? 6 : 3,
              opacity: selectedRouteId === route.id ? 1 : 0.55
            };
          })
        : [],
    [selectedRouteId, showRouteLines, sortedRoutes, users]
  );

  const toggleSelectedRoute = (routeId: string) => {
    setSelectedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  const selectedRoute = selectedRouteId ? sortedRoutes.find((route) => route.id === selectedRouteId) ?? null : null;

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">Карта маршрутов</h1>
        <Link className="btn btn-outline-primary map-back-btn" to="/routes-list">
          К списку маршрутов
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 map-controls-wrap">
            <div className="d-flex flex-wrap gap-2 align-items-center map-filter-row">
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
              <button type="button" className="btn btn-sm btn-outline-secondary d-none d-md-inline-block" onClick={() => setFitBoundsToken((prev) => prev + 1)}>
                Подогнать маршруты
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary d-none d-md-inline-block" onClick={() => setResetViewToken((prev) => prev + 1)}>
                Сброс вида
              </button>
            </div>
            <div className="form-check m-0 d-none d-md-flex">
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

          {selectedRoute && (
            <div className="alert alert-primary py-2 px-3 mb-3">
              <strong>{selectedRoute.name}</strong> · {formatDistanceMeters(lineDistanceMeters(selectedRoute.routeLineGeoJson.coordinates))}
            </div>
          )}

          <MapView
            overlays={overlays}
            height={620}
            onOverlaySelect={(overlayId) => setSelectedRouteId(overlayId.replace('route-', ''))}
            fitBoundsToken={fitBoundsToken}
            resetViewToken={resetViewToken}
          />
        </div>
      </div>
    </div>
  );
}
