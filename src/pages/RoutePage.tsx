import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, apiFetchBlob } from '../api';
import { useAuth } from '../auth';
import { ElevationProfile } from '../components/ElevationProfile';
import { MapView } from '../components/MapView';
import { ROUTE_COLORS, type RouteColor } from '../routeColors';
import type { RouteItem, RouteProfile, User } from '../types';
import { formatDate, formatDistanceMeters, formatDurationSeconds, formatElevationMeters } from '../utils';

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function sanitizeFilenamePart(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function RoutePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [participantsSaving, setParticipantsSaving] = useState(false);
  const [colorSaving, setColorSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [participantDraftIds, setParticipantDraftIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<RouteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError(null);

      const [routeRes, usersRes] = await Promise.all([
        apiFetch<{ route: RouteItem }>(`/api/routes/${id}`),
        apiFetch<{ users: User[] }>('/api/users')
      ]);
      setRoute(routeRes.route);
      setNameDraft(routeRes.route.name);
      setUsers(usersRes.users);
      setParticipantDraftIds(routeRes.route.participantUserIds ?? []);

      try {
        const profileRes = await apiFetch<{ profile: RouteProfile }>(`/api/routes/${id}/profile`);
        setProfile(profileRes.profile);
      } catch (profileLoadError) {
        setProfile(null);
        setProfileError(profileLoadError instanceof Error ? profileLoadError.message : 'Не удалось загрузить профиль высоты');
      } finally {
        setProfileLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route');
      setProfileLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateVisibility = async (visibility: 'private' | 'public') => {
    if (!route) {
      return;
    }

    setVisibilitySaving(true);
    try {
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility })
      });
      setRoute(response.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route visibility');
    } finally {
      setVisibilitySaving(false);
    }
  };

  const saveName = async () => {
    if (!route) {
      return;
    }

    const nextName = nameDraft.trim();
    if (!nextName) {
      setError('Название маршрута не может быть пустым');
      return;
    }

    try {
      setNameSaving(true);
      setError(null);
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/name`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nextName })
      });
      setRoute(response.route);
      setNameDraft(response.route.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route name');
    } finally {
      setNameSaving(false);
    }
  };

  const downloadRoute = async () => {
    if (!route) {
      return;
    }

    try {
      setDownloading(true);
      const blob = await apiFetchBlob(`/api/routes/${route.id}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = sanitizeFilenamePart(route.name) || route.id;
      link.download = `${filename}.gpx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download route');
    } finally {
      setDownloading(false);
    }
  };

  const updateRating = async (rating: number) => {
    if (!route) {
      return;
    }
    try {
      setRatingSaving(true);
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/rating`, {
        method: 'PATCH',
        body: JSON.stringify({ rating })
      });
      setRoute(response.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route rating');
    } finally {
      setRatingSaving(false);
    }
  };

  const updateColor = async (color: RouteColor) => {
    if (!route) {
      return;
    }

    try {
      setColorSaving(true);
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/color`, {
        method: 'PATCH',
        body: JSON.stringify({ color })
      });
      setRoute(response.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route color');
    } finally {
      setColorSaving(false);
    }
  };

  const saveParticipants = async () => {
    if (!route) {
      return;
    }

    try {
      setParticipantsSaving(true);
      const response = await apiFetch<{ route: RouteItem }>(`/api/routes/${route.id}/participants`, {
        method: 'PATCH',
        body: JSON.stringify({ userIds: participantDraftIds })
      });
      setRoute(response.route);
      setParticipantDraftIds(response.route.participantUserIds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route users');
    } finally {
      setParticipantsSaving(false);
    }
  };

  const deleteRoute = async () => {
    if (!route) {
      return;
    }
    const confirmed = window.confirm('Удалить маршрут?');
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      await apiFetch<{ ok: boolean }>(`/api/routes/${route.id}`, { method: 'DELETE' });
      navigate('/routes-list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
      setDeleting(false);
    }
  };

  if (!route) {
    return (
      <div className="container page-wrap py-4">{error ? <div className="alert alert-danger">{error}</div> : <p>Loading...</p>}</div>
    );
  }

  const participantNames = (route.participantUserIds ?? [])
    .map((participantId) => users.find((candidate) => candidate.id === participantId)?.name)
    .filter((name): name is string => Boolean(name));
  const creatorName = users.find((candidate) => candidate.id === route.createdBy)?.name ?? 'Unknown';

  const canManage = Boolean(user && (route.createdBy === user.id || user.role === 'admin'));
  const avgSpeedKmh =
    profile && profile.durationSeconds && profile.durationSeconds > 0
      ? (profile.totalDistanceMeters / 1000 / (profile.durationSeconds / 3600)).toFixed(2)
      : null;

  const formatSlopePercent = (value: number | null): string => {
    if (typeof value !== 'number') {
      return '—';
    }
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container page-wrap py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 m-0">{route.name}</h1>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={downloading} onClick={() => void downloadRoute()}>
          {downloading ? 'Скачиваем...' : 'Скачать GPX'}
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card mb-3">
        <div className="card-body route-meta-card">
          <div className="route-meta-row route-meta-pills">
            <span className="route-meta-pill">
              Видимость:{' '}
              <span className={`badge ms-1 ${route.visibility === 'public' ? 'text-bg-primary' : 'text-bg-dark'}`}>
                {route.visibility === 'public' ? 'Публичный' : 'Приватный'}
              </span>
            </span>
            <span className="route-meta-pill">Создан: {formatDate(route.createdAt)}</span>
            <span className="route-meta-pill">Кто создал: {creatorName}</span>
            <span className="route-meta-pill">Рейтинг: {route.rating ? `${route.rating}/10` : 'не задан'}</span>
            <span className="route-meta-pill">Набор: {formatElevationMeters(route.elevationGainMeters)}</span>
            <span className="route-meta-pill">Сброс: {formatElevationMeters(route.elevationLossMeters)}</span>
            <span className="route-meta-pill">Участников: {participantNames.length}</span>
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5 m-0 mb-3">Карта</h2>
          <MapView route={route.routeLineGeoJson} routeColor={route.color ?? ROUTE_COLORS[0]} />
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5 m-0 mb-3">Профиль высоты</h2>

          {profileLoading && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span>Строим профиль маршрута...</span>
            </div>
          )}

          {!profileLoading && profile && (
            <div className="route-profile-layout">
              <div className="route-profile-stats">
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Дистанция</span>
                  <strong>{formatDistanceMeters(profile.totalDistanceMeters)}</strong>
                </div>
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Набор / Сброс</span>
                  <strong>
                    {formatElevationMeters(profile.elevationGainMeters)} / {formatElevationMeters(profile.elevationLossMeters)}
                  </strong>
                </div>
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Макс. уклон</span>
                  <strong>
                    ↗ {formatSlopePercent(profile.maxSlopeUpPercent)} · ↘{' '}
                    {formatSlopePercent(profile.maxSlopeDownPercent !== null ? Math.abs(profile.maxSlopeDownPercent) : null)}
                  </strong>
                </div>
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Время в пути</span>
                  <strong>{formatDurationSeconds(profile.durationSeconds)}</strong>
                </div>
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Средняя скорость</span>
                  <strong>{avgSpeedKmh ? `${avgSpeedKmh} км/ч` : '—'}</strong>
                </div>
                <div className="route-profile-stat-item">
                  <span className="route-profile-stat-label">Старт / Финиш</span>
                  <strong>
                    {profile.startedAt ? formatDate(profile.startedAt) : '—'}
                    {' / '}
                    {profile.finishedAt ? formatDate(profile.finishedAt) : '—'}
                  </strong>
                </div>
              </div>

              <ElevationProfile profile={profile} />
            </div>
          )}

          {!profileLoading && !profile && <p className="text-muted mb-0">{profileError ?? 'Профиль высоты недоступен для этого маршрута.'}</p>}
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h5 m-0 mb-3">Участники маршрута</h2>
          {participantNames.length === 0 && <p className="text-muted mb-0">Пока никто не отмечен.</p>}
          {participantNames.length > 0 && (
            <div className="route-participants">
              {participantNames.map((name) => (
                <span key={name} className="badge text-bg-light border route-user-badge">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {canManage && (
        <section className="card mb-3">
          <div className="card-body d-flex flex-column gap-3">
            <h2 className="h5 m-0">Управление маршрутом</h2>
            <div className="d-flex flex-column gap-2">
              <label className="form-label m-0">Название маршрута</label>
              <div className="d-flex gap-2">
                <input
                  className="form-control form-control-sm"
                  type="text"
                  maxLength={120}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  disabled={nameSaving}
                />
                <button type="button" className="btn btn-primary btn-sm" disabled={nameSaving} onClick={() => void saveName()}>
                  {nameSaving ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </div>
            <div className="route-manage-grid">
              <div>
                <label className="form-label">Доступ</label>
                <select
                  className="form-select form-select-sm"
                  value={route.visibility}
                  disabled={visibilitySaving}
                  onChange={(event) => void updateVisibility(event.target.value as 'private' | 'public')}
                >
                  <option value="private">Приватный</option>
                  <option value="public">Публичный</option>
                </select>
              </div>
              <div>
                <label className="form-label">Рейтинг</label>
                <select
                  className="form-select form-select-sm"
                  value={route.rating ?? 1}
                  disabled={ratingSaving}
                  onChange={(event) => void updateRating(Number(event.target.value))}
                >
                  {Array.from({ length: 10 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}/10
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Цвет</label>
                <div className="route-color-picker route-color-picker-sm" role="radiogroup" aria-label="Цвет маршрута">
                  {ROUTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`route-color-swatch ${(route.color ?? ROUTE_COLORS[0]) === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Выбрать цвет ${color}`}
                      aria-checked={(route.color ?? ROUTE_COLORS[0]) === color}
                      role="radio"
                      disabled={colorSaving}
                      onClick={() => void updateColor(color as RouteColor)}
                    />
                  ))}
                </div>
                <div className="form-text">Значение цвета: {route.color ?? ROUTE_COLORS[0]}</div>
              </div>
            </div>
            <div className="d-flex flex-column gap-2">
              <label className="form-label m-0">Отметить пользователей в прохождении</label>
              <select
                className="form-select form-select-sm"
                multiple
                size={Math.min(Math.max(users.length, 3), 8)}
                value={participantDraftIds}
                onChange={(event) => setParticipantDraftIds(getSelectedValues(event.currentTarget))}
              >
                {users.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
              <div className="form-text">Можно выбрать несколько пользователей, включая пустой список.</div>
              <div className="d-flex justify-content-start">
                <button type="button" className="btn btn-primary" disabled={participantsSaving} onClick={() => void saveParticipants()}>
                  {participantsSaving ? 'Сохраняем...' : 'Сохранить участников'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {canManage && (
        <section className="card border-danger mb-3">
          <div className="card-body">
            <h2 className="h5 text-danger">Опасная зона</h2>
            <p className="mb-3">Удаление уберет маршрут и трек из списка.</p>
            <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void deleteRoute()}>
              {deleting ? 'Удаляем...' : 'Удалить маршрут'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
