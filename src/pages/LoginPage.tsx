import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(name, pin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-wrap min-vh-100 d-flex align-items-center justify-content-center py-4">
      <div className="card shadow-sm" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Bike Routes</h1>
          <p className="text-muted mb-4">Вход для клуба</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Имя</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label">PIN</label>
              <input className="form-control" value={pin} onChange={(e) => setPin(e.target.value)} type="password" required />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
          <p className="text-muted mt-3 mb-0">
            Нет аккаунта? <Link to="/register">Регистрация</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
