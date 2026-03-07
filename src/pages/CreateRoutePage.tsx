import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapView } from '../components/MapView';
import type { LineStringGeoJson, RouteItem } from '../types';
import { parseGpxPreview } from '../utils';

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

export function CreateRoutePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [routeLine, setRouteLine] = useState<LineStringGeoJson | undefined>();
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = fileMeta(file);

  const onFileChange = async (nextFile: File | null) => {
    setFile(nextFile);
    setError(null);

    if (!nextFile) {
      setRouteLine(undefined);
      return;
    }

    try {
      const parsed = await parseGpxPreview(nextFile);
      setRouteLine(parsed);
    } catch (err) {
      setRouteLine(undefined);
      setError(err instanceof Error ? err.message : 'Не удалось разобрать GPX');
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Введите название маршрута');
      return;
    }

    if (!file || !routeLine) {
      setError('Выберите GPX файл для маршрута');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiFetch<{ route: RouteItem }>('/api/routes', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          visibility,
          routeLineGeoJson: routeLine
        })
      });

      navigate(`/routes/${response.route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать маршрут');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page-wrap py-4">
      <h1 className="h3 mb-3">Создать маршрут</h1>
      <form className="card mb-3" onSubmit={onSubmit}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Название маршрута</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">GPX маршрута</label>
            <input
              className="form-control"
              type="file"
              accept=".gpx,application/gpx+xml"
              onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
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
            <label className="form-label">Видимость маршрута</label>
            <select className="form-select" value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
              <option value="private">Приватный (виден только мне)</option>
              <option value="public">Публичный (виден всем)</option>
            </select>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Создаём...' : 'Создать маршрут'}
          </button>
        </div>
      </form>

      {routeLine && (
        <section className="card">
          <div className="card-body">
            <h2 className="h5">Предпросмотр маршрута</h2>
            <MapView route={routeLine} />
          </div>
        </section>
      )}
    </div>
  );
}
