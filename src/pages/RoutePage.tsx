import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { Activity, RouteCompletion, RouteItem } from '../types';
import { formatDate } from '../utils';

export function RoutePage() {
  const { id } = useParams();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [completions, setCompletions] = useState<RouteCompletion[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showTracks, setShowTracks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    }

    void load();
  }, [id]);

  const overlays = useMemo(
    () =>
      (showTracks ? activities : []).map((activity) => ({
        id: activity.id,
        line: activity.polylineGeoJson,
        color: '#ef4f4f'
      })),
    [showTracks, activities]
  );

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
            <ul className="mb-0">
              {completions.map((completion) => (
                <li key={`${completion.activityId}-${completion.userId}`}>
                  <Link to={`/activities/${completion.activityId}`}>{completion.userName}</Link>
                  <span> · {formatDate(completion.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
