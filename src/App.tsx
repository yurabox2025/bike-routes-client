import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActivityPage } from './pages/ActivityPage';
import { AllRoutesMapPage } from './pages/AllRoutesMapPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoutePage } from './pages/RoutePage';
import { UploadPage } from './pages/UploadPage';

function AppShell() {
  const { user, logout } = useAuth();

  return (
    <>
      {user && (
        <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
          <div className="container page-wrap">
            <Link to="/" className="navbar-brand">
              Bike Routes
            </Link>
            <div className="navbar-nav me-auto">
              <Link to="/upload" className="nav-link">
                Upload
              </Link>
              <Link to="/map" className="nav-link">
                All Map
              </Link>
            </div>
            <div className="d-flex align-items-center gap-2 text-white">
              <span>{user.name}</span>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

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
