import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { Activity, LineStringGeoJson, RouteItem, User } from '../types';
import { parseGpxPreview } from '../utils';

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

export function UploadPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewLine, setPreviewLine] = useState<LineStringGeoJson | undefined>();
  const [trimMeters, setTrimMeters] = useState(0);
  const [routeId, setRouteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const [routesResponse, usersResponse] = await Promise.all([
        apiFetch<{ routes: RouteItem[] }>('/api/routes'),
        apiFetch<{ users: User[] }>('/api/users')
      ]);
      setRoutes(routesResponse.routes);
      setUsers(usersResponse.users);
    }

    void loadData();
  }, []);

  const handleFileChange = async (nextFile: File | null) => {
    setFile(nextFile);
    setError(null);

    if (!nextFile) {
      setPreviewLine(undefined);
      return;
    }

    try {
      const preview = await parseGpxPreview(nextFile);
      setPreviewLine(preview);
    } catch (err) {
      setPreviewLine(undefined);
      setError(err instanceof Error ? err.message : 'Не удалось разобрать GPX');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Нужно выбрать GPX файл');
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('gpx', file);
    if (trimMeters > 0) {
      formData.append('trimMeters', String(trimMeters));
    }
    if (routeId) {
      formData.append('routeId', routeId);
    }
    if (selectedParticipantIds.length > 0) {
      formData.append('participantUserIds', JSON.stringify(selectedParticipantIds));
    }

    try {
      const response = await apiFetch<{ activity: Activity }>('/api/activities', {
        method: 'POST',
        body: formData
      });

      navigate(`/activities/${response.activity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сохранение не удалось');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page-wrap py-4">
      <h1 className="h3 mb-3">Загрузка GPX</h1>
      <form className="card mb-3" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">GPX файл</label>
            <input className="form-control" type="file" accept=".gpx" onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Privacy cut (метров в начале/конце)</label>
            <input className="form-control" type="number" min={0} value={trimMeters} onChange={(e) => setTrimMeters(Number(e.target.value))} />
          </div>
          <div className="mb-3">
            <label className="form-label">Привязать к маршруту</label>
            <select className="form-select" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">Без маршрута</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Отметить пользователей, которые проехали</label>
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
            <div className="form-text">Можно выбрать несколько. Автор загрузки добавляется автоматически.</div>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </form>

      {previewLine && (
        <section className="card">
          <div className="card-body">
            <h2 className="h5">Предпросмотр</h2>
            <MapView route={previewLine} />
          </div>
        </section>
      )}
    </div>
  );
}
