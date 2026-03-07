import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { Activity, LineStringGeoJson, RouteItem, User } from '../types';
import { parseGpxPreview } from '../utils';

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function fileMeta(file: File | null): { ext: string; sizeMb: string; isGpx: boolean } | null {
  if (!file) {
    return null;
  }
  const dotIndex = file.name.lastIndexOf('.');
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex + 1).toLowerCase() : '';
  return {
    ext: ext || 'unknown',
    sizeMb: (file.size / (1024 * 1024)).toFixed(2),
    isGpx: ext === 'gpx'
  };
}

export function UploadPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isRoutesLoading, setIsRoutesLoading] = useState(true);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewLine, setPreviewLine] = useState<LineStringGeoJson | undefined>();
  const [trimMeters, setTrimMeters] = useState(0);
  const [routeId, setRouteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = fileMeta(file);

  useEffect(() => {
    async function loadData() {
      setIsRoutesLoading(true);
      try {
        const [routesResponse, usersResponse] = await Promise.all([
          apiFetch<{ routes: RouteItem[] }>('/api/routes'),
          apiFetch<{ users: User[] }>('/api/users')
        ]);
        setRoutes(routesResponse.routes);
        setUsers(usersResponse.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список маршрутов');
      } finally {
        setIsRoutesLoading(false);
      }
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
    if (!routeId) {
      setError('Сначала выберите маршрут. Маршрут создается отдельно на странице создания маршрута.');
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('gpx', file);
    formData.append('routeId', routeId);
    if (trimMeters > 0) {
      formData.append('trimMeters', String(trimMeters));
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
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">Загрузка прохождения маршрута</h1>
        <Link className="btn btn-outline-primary" to="/routes/new">
          Сначала создать маршрут
        </Link>
      </div>
      <form className="card mb-3" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Маршрут (обязательно)</label>
            {isRoutesLoading && (
              <div className="d-flex align-items-center gap-2 text-muted mb-2">
                <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Загрузка маршрутов...</span>
              </div>
            )}
            <select className="form-select" value={routeId} onChange={(e) => setRouteId(e.target.value)} disabled={isRoutesLoading}>
              <option value="">Выберите маршрут</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">GPX файл прохождения</label>
            <input
              className="form-control"
              type="file"
              accept=".gpx,application/gpx+xml"
              onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
            />
            <div className="form-text">Допустимый формат: `.gpx`</div>
            {meta && (
              <div className="small mt-1">
                <span className={`badge me-2 ${meta.isGpx ? 'text-bg-success' : 'text-bg-danger'}`}>{meta.isGpx ? 'GPX' : 'Не GPX'}</span>
                <span className="me-2">Файл: {file!.name}</span>
                <span className="me-2">Расширение: .{meta.ext}</span>
                <span>Размер: {meta.sizeMb} MB</span>
              </div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Privacy cut (метров в начале/конце)</label>
            <input className="form-control" type="number" min={0} value={trimMeters} onChange={(e) => setTrimMeters(Number(e.target.value))} />
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
            {saving ? 'Сохраняем...' : 'Сохранить прохождение'}
          </button>
        </div>
      </form>

      {previewLine && (
        <section className="card">
          <div className="card-body">
            <h2 className="h5">Предпросмотр прохождения</h2>
            <MapView route={previewLine} />
          </div>
        </section>
      )}
    </div>
  );
}
