import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import type { Activity, RouteItem } from '../types';
import { formatDate, formatDistanceMeters } from '../utils';

export function HomePage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [routesRes, activitiesRes] = await Promise.all([
        apiFetch<{ routes: RouteItem[] }>('/api/routes'),
        apiFetch<{ activities: Activity[] }>('/api/activities')
      ]);
      setRoutes(routesRes.routes);
      setActivities(activitiesRes.activities);
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
      await apiFetch<{ ok: boolean }>(`/api/routes/${routeId}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    }
  };

  const setRouteVisibility = async (routeId: string, visibility: 'public' | 'private') => {
    try {
      await apiFetch<{ route: RouteItem }>(`/api/routes/${routeId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility })
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route visibility');
    }
  };

  const recentActivities = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity.routeId !== null)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 20),
    [activities]
  );

  const routesById = useMemo(() => {
    const map = new Map<string, RouteItem>();
    for (const route of routes) {
      map.set(route.id, route);
    }
    return map;
  }, [routes]);

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 className="h3 m-0">Маршруты</h1>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <section className="card h-100 shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5">Список маршрутов</h2>
              {isLoading && (
                <div className="d-flex align-items-center gap-2 text-muted mb-2">
                  <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Загрузка маршрутов...</span>
                </div>
              )}
              {!isLoading && routes.length === 0 && <p className="text-muted mb-0">Маршрутов пока нет. Сначала создайте маршрут.</p>}
              {!isLoading && routes.length > 0 && (
                <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
                  {routes.map((route) => (
                    <li key={route.id} className="border rounded p-2 d-flex align-items-center justify-content-between gap-2 bg-white">
                      <div className="d-flex flex-column">
                        <Link to={`/routes/${route.id}`}>{route.name}</Link>
                        <small className="text-muted">{route.visibility === 'private' ? 'Приватный' : 'Публичный'}</small>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void deleteRoute(route.id)}>
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-6">
          <section className="card h-100 shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5">Последние поездки</h2>
              {isLoading && (
                <div className="d-flex align-items-center gap-2 text-muted mb-2">
                  <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Загрузка поездок...</span>
                </div>
              )}
              {!isLoading && recentActivities.length === 0 && <p className="text-muted mb-0">Пока нет поездок.</p>}
              {!isLoading && recentActivities.length > 0 && (
                <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
                  {recentActivities.map((activity) => (
                    <li key={activity.id} className="border rounded p-2 d-flex flex-wrap align-items-center justify-content-between gap-2 bg-white">
                      <div>
                        <Link to={`/activities/${activity.id}`}>{formatDate(activity.startedAt)}</Link>
                        <span> · {formatDistanceMeters(activity.distanceMeters)}</span>
                      </div>
                      {activity.routeId &&
                        routesById.get(activity.routeId) &&
                        user &&
                        (user.role === 'admin' || routesById.get(activity.routeId)!.createdBy === user.id) && (
                        <select
                          className="form-select form-select-sm"
                          style={{ width: '170px' }}
                          value={routesById.get(activity.routeId)!.visibility}
                          onChange={(event) => void setRouteVisibility(activity.routeId!, event.target.value as 'public' | 'private')}
                        >
                          <option value="private">Приватный</option>
                          <option value="public">Публичный</option>
                        </select>
                      )}
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
