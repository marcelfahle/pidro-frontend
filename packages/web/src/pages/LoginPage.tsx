import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(username, password);
      setSession({ accessToken: response.token, user: response.user });
      navigate('/home');
    } catch {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pidro-page">
      <div className="pidro-window flex h-dvh flex-col items-center justify-center overflow-y-auto px-5 py-4 max-sm:justify-start max-sm:px-4 max-sm:pt-3">
        <img
          src={homeLogoUrl}
          alt="Pidro"
          className="pointer-events-none w-[280px] max-w-[65vw] select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] max-sm:w-[180px]"
        />

        <div className="mt-1 w-full max-w-[380px]">
          <div className="pidro-panel pidro-panel--glow p-5 max-sm:p-4">
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-3">
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                aria-label="Username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pidro-input"
                required
              />
              <div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  aria-label="Password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pidro-input"
                  required
                />
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    className="text-[11px] font-bold tracking-wide text-cyan-200/70 transition-colors hover:text-cyan-100"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-cyan-200/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/45">or</span>
              <div className="h-px flex-1 bg-cyan-200/20" />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--pidro-radius-surface)] border border-white/80 bg-white px-3 py-2.5 text-[13px] font-semibold text-black/80 opacity-55 transition-opacity"
              >
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.37 1.62c.07 1.17-.34 2.33-1.06 3.2-.73.86-1.9 1.53-3.06 1.44-.09-1.14.42-2.33 1.1-3.08.76-.86 2.02-1.5 3.02-1.56Zm3.75 6.1c-.2.12-2.4 1.4-2.37 4.16.03 3.32 2.92 4.43 2.95 4.45-.02.08-.46 1.58-1.52 3.13-.92 1.33-1.87 2.67-3.37 2.7-1.47.02-1.95-.88-3.63-.88-1.68 0-2.21.85-3.6.9-1.45.05-2.55-1.44-3.48-2.77-1.9-2.72-3.35-7.7-1.4-11.07.97-1.67 2.7-2.73 4.58-2.76 1.42-.02 2.76.96 3.63.96.87 0 2.5-1.19 4.21-1.01.72.03 2.73.29 4.03 2.19Z" />
                </svg>
                <span className="max-sm:hidden">Apple</span>
              </button>
              <button
                type="button"
                disabled
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--pidro-radius-surface)] border border-[#1877F2]/50 bg-[#1877F2] px-3 py-2.5 text-[13px] font-semibold text-white opacity-55 transition-opacity"
              >
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.12 22 16.99 22 12Z" />
                </svg>
                <span className="max-sm:hidden">Facebook</span>
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            <Link to="/register" className="block">
              <Button variant="glass" size="md" className="w-full">
                Create Account
              </Button>
            </Link>

            <button
              type="button"
              className="group flex w-full items-center justify-center gap-2 rounded-[var(--pidro-radius-surface)] border border-dashed border-amber-400/30 bg-amber-500/5 px-3 py-2.5 text-[12px] font-bold text-amber-200/75 transition-all hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-100"
            >
              <svg className="h-4 w-4 shrink-0 text-amber-400/60 transition-colors group-hover:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Migrate from Classic Pidro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
