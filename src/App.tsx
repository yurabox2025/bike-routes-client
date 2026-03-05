import { useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActivityPage } from './pages/ActivityPage';
import { AllRoutesMapPage } from './pages/AllRoutesMapPage';
import { CreateRoutePage } from './pages/CreateRoutePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoutePage } from './pages/RoutePage';
import { UploadPage } from './pages/UploadPage';

function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {user && (
        <nav className="navbar navbar-dark bg-dark fixed-top shadow-sm">
          <div className="container page-wrap d-flex flex-wrap align-items-center gap-2">
            <div className="d-flex align-items-center gap-3 flex-grow-1">
              <Link to="/" className="navbar-brand m-0">
                Bike Routes
              </Link>
              <button
                type="button"
                className="navbar-toggler d-lg-none ms-auto"
                aria-label="Toggle navigation"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="navbar-toggler-icon" />
              </button>
              <div className="d-none d-lg-flex flex-wrap align-items-center gap-2">
                <Link to="/routes/new" className="nav-link px-0 py-1" onClick={() => setMenuOpen(false)}>
                  Create Route
                </Link>
                <Link to="/upload" className="nav-link px-0 py-1" onClick={() => setMenuOpen(false)}>
                  Upload Completion
                </Link>
                <Link to="/map" className="nav-link px-0 py-1" onClick={() => setMenuOpen(false)}>
                  All Map
                </Link>
              </div>
            </div>
            <div className="ms-auto d-none d-lg-flex align-items-center gap-2 text-white">
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
            {menuOpen && (
              <div className="mobile-nav-menu w-100 d-lg-none mt-2">
                <Link to="/routes/new" className="nav-link py-2" onClick={() => setMenuOpen(false)}>
                  Create Route
                </Link>
                <Link to="/upload" className="nav-link py-2" onClick={() => setMenuOpen(false)}>
                  Upload Completion
                </Link>
                <Link to="/map" className="nav-link py-2" onClick={() => setMenuOpen(false)}>
                  All Map
                </Link>
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
            )}
          </div>
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
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes/new"
            element={
              <ProtectedRoute>
                <CreateRoutePage />
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
