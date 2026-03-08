import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { useAuthStore } from './stores/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:code"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
