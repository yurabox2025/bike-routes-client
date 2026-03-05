import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import type { Activity, RouteItem } from '../types';
import { formatDate, formatDistanceMeters } from '../utils';

export function HomePage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [routesRes, activitiesRes] = await Promise.all([
        apiFetch<{ routes: RouteItem[] }>('/api/routes'),
        apiFetch<{ activities: Activity[] }>('/api/activities')
      ]);
      setRoutes(routesRes.routes);
      setActivities(activitiesRes.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
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

  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 20),
    [activities]
  );

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">Маршруты</h1>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to="/map">
            Общая карта
          </Link>
          <Link className="btn btn-primary" to="/upload">
            Загрузить GPX
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <section className="card h-100">
            <div className="card-body">
              <h2 className="h5">Список маршрутов</h2>
              {routes.length === 0 && <p className="text-muted mb-0">Маршрутов пока нет. Создайте из любой activity.</p>}
              {routes.length > 0 && (
                <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
                  {routes.map((route) => (
                    <li key={route.id} className="border rounded p-2 d-flex align-items-center justify-content-between gap-2">
                      <Link to={`/routes/${route.id}`}>{route.name}</Link>
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
          <section className="card h-100">
            <div className="card-body">
              <h2 className="h5">Последние поездки</h2>
              {recentActivities.length === 0 && <p className="text-muted mb-0">Пока нет поездок.</p>}
              {recentActivities.length > 0 && (
                <ul className="mb-0">
                  {recentActivities.map((activity) => (
                    <li key={activity.id}>
                      <Link to={`/activities/${activity.id}`}>{formatDate(activity.startedAt)}</Link>
                      <span> · {formatDistanceMeters(activity.distanceMeters)}</span>
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
