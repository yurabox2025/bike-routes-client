import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (pin !== confirmPin) {
      setError('PIN и подтверждение PIN не совпадают');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), pin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-wrap min-vh-100 d-flex align-items-center justify-content-center py-4">
      <div className="card shadow-sm" style={{ maxWidth: 460, width: '100%' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Регистрация</h1>
          <p className="text-muted mb-4">Создайте пользователя для Bike Routes</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Имя</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={80} />
            </div>
            <div className="mb-3">
              <label className="form-label">PIN</label>
              <input className="form-control" value={pin} onChange={(e) => setPin(e.target.value)} type="password" required minLength={3} maxLength={32} />
            </div>
            <div className="mb-3">
              <label className="form-label">Подтверждение PIN</label>
              <input
                className="form-control"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                type="password"
                required
                minLength={3}
                maxLength={32}
              />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Создаём...' : 'Зарегистрироваться'}
            </button>
          </form>
          <p className="text-muted mt-3 mb-0">
            Уже есть доступ? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
