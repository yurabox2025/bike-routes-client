import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActivityPage } from './pages/ActivityPage';
import { AllRoutesMapPage } from './pages/AllRoutesMapPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoutePage } from './pages/RoutePage';
import { UploadPage } from './pages/UploadPage';

const navItems = [
  { to: '/upload', label: 'Загрузить прохождение' },
  { to: '/routes-list', label: 'Список маршрутов' }
];

function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {user && (
        <nav className="navbar navbar-dark bg-dark fixed-top app-navbar">
          <div className="container page-wrap d-flex align-items-center gap-2">
            <Link to="/" className="navbar-brand m-0">
              Bike Routes
            </Link>

            <button
              type="button"
              className="navbar-toggler d-md-none ms-auto"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div className="d-none d-md-flex align-items-center gap-3 ms-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="ms-auto d-none d-md-flex align-items-center gap-2 text-white">
              <span>{user.name}</span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="mobile-nav-menu d-md-none">
              <div className="px-3 py-2 d-grid gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link py-2 ${isActive ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="d-flex align-items-center justify-content-between pt-2 mt-2 border-top border-secondary-subtle">
                  <span className="text-white-50 small">{user.name}</span>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}

      <main className={user ? 'app-content with-fixed-header' : 'app-content'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AllRoutesMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes-list"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes/new"
            element={
              <ProtectedRoute>
                <Navigate to="/upload" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <AllRoutesMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-map"
            element={
              <ProtectedRoute>
                <Navigate to="/" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes/:id"
            element={
              <ProtectedRoute>
                <RoutePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activities/:id"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
