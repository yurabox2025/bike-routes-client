import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiFetchBlob } from '../api';
import { useAuth } from '../auth';
import type { RouteItem, User } from '../types';
import { formatDate, formatDistanceMeters, lineDistanceMeters } from '../utils';

function sanitizeFilenamePart(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function HomePage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingRouteId, setDownloadingRouteId] = useState<string | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [routesRes, usersRes] = await Promise.all([
        apiFetch<{ routes: RouteItem[] }>('/api/routes'),
        apiFetch<{ users: User[] }>('/api/users')
      ]);
      setRoutes(routesRes.routes);
      setUsers(usersRes.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const deleteRoute = async (routeId: string) => {
    const confirmed = window.confirm('Удалить маршрут из списка? Все связанные поездки будут отвязаны от этого маршрута.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingRouteId(routeId);
      await apiFetch<{ ok: boolean }>(`/api/routes/${routeId}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    } finally {
      setDeletingRouteId(null);
    }
  };

  const downloadRoute = async (routeId: string, routeName: string) => {
    try {
      setDownloadingRouteId(routeId);
      const blob = await apiFetchBlob(`/api/routes/${routeId}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = sanitizeFilenamePart(routeName) || routeId;
      link.download = `${filename}.gpx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download route');
    } finally {
      setDownloadingRouteId(null);
    }
  };

  const sortedRoutes = useMemo(
    () =>
      [...routes].sort((a, b) => {
        const aTs = new Date(a.createdAt).getTime();
        const bTs = new Date(b.createdAt).getTime();
        return bTs - aTs;
      }),
    [routes]
  );

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 className="h3 m-0">Маршруты</h1>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-12">
          <section className="card h-100 shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5">Список маршрутов</h2>
              {isLoading && (
                <div className="d-flex align-items-center gap-2 text-muted mb-2">
                  <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Загрузка маршрутов...</span>
                </div>
              )}
              {!isLoading && sortedRoutes.length === 0 && <p className="text-muted mb-0">Маршрутов пока нет.</p>}
              {!isLoading && sortedRoutes.length > 0 && (
                <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
                  {sortedRoutes.map((route) => (
                    <li key={route.id} className="border rounded p-3 d-flex flex-column gap-3 bg-white route-item-card">
                      <div className="d-flex align-items-center justify-content-between gap-2 route-item-row">
                        <div className="d-flex flex-column">
                          <Link to={`/routes/${route.id}`}>{route.name}</Link>
                          <small className="text-muted">
                            {formatDate(route.createdAt)} · {route.visibility === 'private' ? 'Приватный' : 'Публичный'} ·{' '}
                            {formatDistanceMeters(lineDistanceMeters(route.routeLineGeoJson.coordinates))}
                          </small>
                          <small className="text-muted">Загрузил: {users.find((candidate) => candidate.id === route.createdBy)?.name ?? 'Unknown'}</small>
                        </div>
                        <div className="d-flex align-items-center gap-2 route-item-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary route-download-btn"
                            disabled={downloadingRouteId === route.id}
                            onClick={() => void downloadRoute(route.id, route.name)}
                          >
                            {downloadingRouteId === route.id ? 'Скачиваем...' : 'Скачать GPX'}
                          </button>
                          {user && (user.role === 'admin' || user.id === route.createdBy) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={deletingRouteId === route.id}
                              onClick={() => void deleteRoute(route.id)}
                            >
                              {deletingRouteId === route.id ? 'Удаляем...' : 'Удалить'}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
