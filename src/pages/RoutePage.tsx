import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { MapView } from '../components/MapView';
import type { Activity, RouteCompletion, RouteItem } from '../types';
import { formatDate } from '../utils';

export function RoutePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [completions, setCompletions] = useState<RouteCompletion[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showTracks, setShowTracks] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      const routeRes = await apiFetch<{ route: RouteItem; completions: RouteCompletion[] }>(`/api/routes/${id}`);
      setRoute(routeRes.route);
      setCompletions(routeRes.completions);

      const activitiesRes = await apiFetch<{ activities: Activity[] }>(`/api/activities?routeId=${id}`);
      setActivities(activitiesRes.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route');
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const overlays = useMemo(
    () =>
      (showTracks ? activities : []).map((activity) => ({
        id: activity.id,
        line: activity.polylineGeoJson,
        color: '#ef4f4f'
      })),
    [showTracks, activities]
  );

  const activityOwnerById = useMemo(() => {
    const map = new Map<string, string>();
    for (const activity of activities) {
      map.set(activity.id, activity.userId);
    }
    return map;
  }, [activities]);

  const removeUserFromCompletion = async (activityId: string, userId: string) => {
    const confirmed = window.confirm('Убрать этого пользователя из прохождения маршрута?');
    if (!confirmed) {
      return;
    }

    try {
      await apiFetch<{ activity: Activity }>(`/api/activities/${activityId}/participants/${userId}`, {
        method: 'DELETE'
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user from route');
    }
  };

  const deleteCompletion = async (activityId: string) => {
    const confirmed = window.confirm('Удалить это прохождение маршрута целиком?');
    if (!confirmed) {
      return;
    }

    try {
      await apiFetch<{ ok: boolean }>(`/api/activities/${activityId}`, {
        method: 'DELETE'
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete completed route');
    }
  };

  const toggleVisibility = async () => {
    if (!route) {
      return;
    }

    setVisibilitySaving(true);
    try {
      const nextVisibility = route.visibility === 'public' ? 'private' : 'public';
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: nextVisibility })
      });
      setRoute(response.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route visibility');
    } finally {
      setVisibilitySaving(false);
    }
  };

  if (!route) {
    return (
      <div className="container page-wrap py-4">{error ? <div className="alert alert-danger">{error}</div> : <p>Loading...</p>}</div>
    );
  }

  return (
    <div className="container page-wrap py-4">
      <h1 className="h3 mb-3">{route.name}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card mb-3">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <strong>Видимость:</strong>{' '}
            <span className={`badge ${route.visibility === 'public' ? 'text-bg-primary' : 'text-bg-dark'}`}>
              {route.visibility === 'public' ? 'Публичный' : 'Приватный'}
            </span>
          </div>
          {user && route.createdBy === user.id && (
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={visibilitySaving} onClick={() => void toggleVisibility()}>
              {visibilitySaving ? 'Сохраняем...' : route.visibility === 'public' ? 'Сделать приватным' : 'Сделать публичным'}
            </button>
          )}
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="h5 m-0">Карта</h2>
            <div className="form-check m-0">
              <input
                id="showTracks"
                className="form-check-input"
                type="checkbox"
                checked={showTracks}
                onChange={(e) => setShowTracks(e.target.checked)}
              />
              <label htmlFor="showTracks" className="form-check-label">
                Показать треки прохождений
              </label>
            </div>
          </div>
          <MapView route={route.routeLineGeoJson} overlays={overlays} />
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5">Кто и когда проезжал</h2>
          {completions.length === 0 && <p className="text-muted mb-0">Пока нет прохождений.</p>}
          {completions.length > 0 && (
            <ul className="mb-0 list-unstyled d-flex flex-column gap-2">
              {completions.map((completion) => (
                <li key={`${completion.activityId}-${completion.userId}`} className="border rounded p-2">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <Link to={`/activities/${completion.activityId}`}>{completion.userName}</Link>
                      <span> · {formatDate(completion.startedAt)}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => void removeUserFromCompletion(completion.activityId, completion.userId)}
                      >
                        Удалить пользователя
                      </button>
                      {user &&
                        (user.role === 'admin' || activityOwnerById.get(completion.activityId) === user.id) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => void deleteCompletion(completion.activityId)}
                          >
                            Удалить прохождение
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
  );
}
