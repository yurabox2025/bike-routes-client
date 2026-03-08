import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { RouteItem, User } from '../types';
import { formatDate, formatDistanceMeters, lineDistanceMeters } from '../utils';

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
  const [users, setUsers] = useState<User[]>([]);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fitBoundsToken, setFitBoundsToken] = useState(0);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
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
            return {
              id: overlayId,
              line: route.routeLineGeoJson,
              color: routeColorById(route.id),
              label: route.name,
              subtitle: `${formatDistanceMeters(lineDistanceMeters(route.routeLineGeoJson.coordinates))} · ${formatDate(route.createdAt)} · ${creatorName}`,
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
            <button type="button" className="btn btn-sm btn-outline-dark d-md-none" onClick={() => setMobilePanelOpen(true)}>
              Фильтры и легенда
            </button>
          </div>

          {selectedRoute && (
            <div className="alert alert-primary py-2 px-3 mb-3">
              <strong>{selectedRoute.name}</strong> · {formatDistanceMeters(lineDistanceMeters(selectedRoute.routeLineGeoJson.coordinates))}
            </div>
          )}

          <div className="map-legend-list d-none d-md-flex mb-3">
            <div className="map-mini-list">
              {sortedRoutes.map((route) => (
                <button
                  key={`mini-${route.id}`}
                  type="button"
                  className={`map-mini-item ${selectedRouteId === route.id ? 'active' : ''}`}
                  onClick={() => toggleSelectedRoute(route.id)}
                >
                  <span className="map-mini-title">
                    <span className="map-legend-dot" style={{ backgroundColor: routeColorById(route.id) }} />
                    {route.name}
                  </span>
                  <span className="map-mini-meta">
                    {formatDate(route.createdAt)} · {formatDistanceMeters(lineDistanceMeters(route.routeLineGeoJson.coordinates))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <MapView
            overlays={overlays}
            height={620}
            onOverlaySelect={(overlayId) => setSelectedRouteId(overlayId.replace('route-', ''))}
            fitBoundsToken={fitBoundsToken}
            resetViewToken={resetViewToken}
          />
        </div>
      </div>

      {mobilePanelOpen && (
        <div className="map-mobile-panel-backdrop d-md-none" onClick={() => setMobilePanelOpen(false)}>
          <div className="map-mobile-panel" onClick={(event) => event.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Фильтры и легенда</strong>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setMobilePanelOpen(false)}>
                Закрыть
              </button>
            </div>
            <div className="d-grid gap-2 mb-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFitBoundsToken((prev) => prev + 1)}>
                Подогнать маршруты
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setResetViewToken((prev) => prev + 1)}>
                Сброс вида
              </button>
            </div>
            <div className="form-check m-0 mb-2">
              <input
                id="showRouteLinesMobile"
                className="form-check-input"
                type="checkbox"
                checked={showRouteLines}
                onChange={(event) => setShowRouteLines(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="showRouteLinesMobile">
                Показывать линии маршрутов
              </label>
            </div>
            <div className="map-legend">
              {sortedRoutes.map((route) => (
                <button
                  key={`mobile-${route.id}`}
                  type="button"
                  className={`map-legend-item ${selectedRouteId === route.id ? 'active' : ''}`}
                  onClick={() => toggleSelectedRoute(route.id)}
                >
                  <span className="map-legend-dot" style={{ backgroundColor: routeColorById(route.id) }} />
                  <span className="map-legend-name">{route.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
