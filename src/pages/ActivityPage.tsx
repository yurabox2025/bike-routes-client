import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { Activity, RouteItem, User } from '../types';
import { formatDate, formatDistanceMeters } from '../utils';

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function normalizeParticipantIds(activity: Activity): string[] {
  if (Array.isArray(activity.participantUserIds) && activity.participantUserIds.length > 0) {
    return activity.participantUserIds;
  }
  return [activity.userId];
}

export function ActivityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [createRouteName, setCreateRouteName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) {
        return;
      }

      try {
        const [activityRes, routesRes, usersRes] = await Promise.all([
          apiFetch<{ activity: Activity }>(`/api/activities/${id}`),
          apiFetch<{ routes: RouteItem[] }>('/api/routes'),
          apiFetch<{ users: User[] }>('/api/users')
        ]);

        setActivity(activityRes.activity);
        setSelectedRoute(activityRes.activity.routeId ?? '');
        setSelectedParticipantIds(normalizeParticipantIds(activityRes.activity));
        setRoutes(routesRes.routes);
        setUsers(usersRes.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      }
    }

    void load();
  }, [id]);

  const assignRoute = async (event: FormEvent) => {
    event.preventDefault();
    if (!activity || !selectedRoute) {
      return;
    }

    try {
      const response = await apiFetch<{ activity: Activity }>(`/api/activities/${activity.id}/assign-route`, {
        method: 'POST',
        body: JSON.stringify({ routeId: selectedRoute })
      });
      setActivity(response.activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign route');
    }
  };

  const saveParticipants = async (event: FormEvent) => {
    event.preventDefault();
    if (!activity) {
      return;
    }

    try {
      const response = await apiFetch<{ activity: Activity }>(`/api/activities/${activity.id}/participants`, {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedParticipantIds })
      });
      setActivity(response.activity);
      setSelectedParticipantIds(normalizeParticipantIds(response.activity));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save participants');
    }
  };

  const unassignRoute = async () => {
    if (!activity) {
      return;
    }

    try {
      const response = await apiFetch<{ activity: Activity }>(`/api/activities/${activity.id}/unassign-route`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setActivity(response.activity);
      setSelectedRoute('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign route');
    }
  };

  const deleteActivity = async () => {
    if (!activity) {
      return;
    }

    const confirmed = window.confirm('Удалить это прохождение маршрута и трек поездки?');
    if (!confirmed) {
      return;
    }

    try {
      await apiFetch<{ ok: boolean }>(`/api/activities/${activity.id}`, {
        method: 'DELETE'
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const createRouteFromActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!activity || !createRouteName.trim()) {
      return;
    }

    try {
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/from-activity/${activity.id}`, {
        method: 'POST',
        body: JSON.stringify({ name: createRouteName.trim() })
      });
      setRoutes((prev) => [response.route, ...prev]);
      setSelectedRoute(response.route.id);
      setCreateRouteName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
    }
  };

  if (!activity) {
    return (
      <div className="container page-wrap py-4">{error ? <div className="alert alert-danger">{error}</div> : <p>Loading...</p>}</div>
    );
  }

  return (
    <div className="container page-wrap py-4">
      <h1 className="h3 mb-3">Поездка</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card mb-3">
        <div className="card-body">
          <p className="mb-2">
            <strong>Дата старта:</strong> {formatDate(activity.startedAt)}
          </p>
          <p className="mb-2">
            <strong>Дистанция:</strong> {formatDistanceMeters(activity.distanceMeters)}
          </p>
          <p className="mb-2">
            <strong>Route ID:</strong> {activity.routeId ?? 'не назначен'}
          </p>
          <p className="mb-0">
            <strong>Отмечено участников:</strong> {normalizeParticipantIds(activity).length}
          </p>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <MapView route={activity.polylineGeoJson} />
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5">Привязать к существующему маршруту</h2>
          <form className="row g-2 align-items-center" onSubmit={assignRoute}>
            <div className="col-12 col-md-8">
              <select className="form-select" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                <option value="">Выберите маршрут</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <button type="submit" className="btn btn-primary w-100" disabled={!selectedRoute}>
                Сохранить
              </button>
            </div>
          </form>
          {activity.routeId && (
            <button type="button" className="btn btn-outline-danger mt-3" onClick={unassignRoute}>
              Удалить маршрут поездки
            </button>
          )}
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5">Отметить пользователей в прохождении</h2>
          <form onSubmit={saveParticipants}>
            <div className="mb-2">
              <select
                className="form-select"
                multiple
                size={Math.min(Math.max(users.length, 3), 8)}
                value={selectedParticipantIds}
                onChange={(e) => setSelectedParticipantIds(getSelectedValues(e.currentTarget))}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <div className="form-text">Можно выбрать несколько пользователей. Автор поездки будет добавлен автоматически.</div>
            </div>
            <button type="submit" className="btn btn-primary">
              Сохранить участников
            </button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5">Создать маршрут из этой поездки</h2>
          <form className="row g-2 align-items-center" onSubmit={createRouteFromActivity}>
            <div className="col-12 col-md-8">
              <input
                className="form-control"
                value={createRouteName}
                onChange={(e) => setCreateRouteName(e.target.value)}
                placeholder="Название маршрута"
                required
              />
            </div>
            <div className="col-12 col-md-4">
              <button type="submit" className="btn btn-primary w-100">
                Создать
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card mt-3 border-danger">
        <div className="card-body">
          <h2 className="h5 text-danger">Опасная зона</h2>
          <p className="mb-3">Удаление уберет прохождение маршрута и трек из списка.</p>
          <button type="button" className="btn btn-danger" onClick={deleteActivity}>
            Удалить пройденный маршрут
          </button>
        </div>
      </section>
    </div>
  );
}
