import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
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
      <div className="pidro-window flex h-dvh flex-col items-center overflow-y-auto px-4 py-6">
        <img
          src={homeLogoUrl}
          alt="Pidro"
          className="pointer-events-none w-[340px] max-w-[70vw] select-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] max-sm:w-[260px]"
        />

        <div className="w-full max-w-[400px] space-y-5">
          <PageHeader title="Sign In" size="sm" />

          <div className="pidro-panel pidro-panel--glow p-5">
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-cyan-50/70"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pidro-input"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-cyan-50/70"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pidro-input"
                  required
                />
              </div>
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-cyan-200/20" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-50/50">or</span>
              <div className="h-px flex-1 bg-cyan-200/20" />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled
                className="flex w-full items-center gap-3 rounded-[var(--pidro-radius-surface)] border border-white/90 bg-white px-4 py-3 text-sm font-bold text-black/85 opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.37 1.62c.07 1.17-.34 2.33-1.06 3.2-.73.86-1.9 1.53-3.06 1.44-.09-1.14.42-2.33 1.1-3.08.76-.86 2.02-1.5 3.02-1.56Zm3.75 6.1c-.2.12-2.4 1.4-2.37 4.16.03 3.32 2.92 4.43 2.95 4.45-.02.08-.46 1.58-1.52 3.13-.92 1.33-1.87 2.67-3.37 2.7-1.47.02-1.95-.88-3.63-.88-1.68 0-2.21.85-3.6.9-1.45.05-2.55-1.44-3.48-2.77-1.9-2.72-3.35-7.7-1.4-11.07.97-1.67 2.7-2.73 4.58-2.76 1.42-.02 2.76.96 3.63.96.87 0 2.5-1.19 4.21-1.01.72.03 2.73.29 4.03 2.19Z" />
                </svg>
                Sign in with Apple
              </button>
              <button
                type="button"
                disabled
                className="flex w-full items-center gap-3 rounded-[var(--pidro-radius-surface)] border border-[#1877F2]/60 bg-[#1877F2] px-4 py-3 text-sm font-bold text-white opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.12 22 16.99 22 12Z" />
                </svg>
                Connect with Facebook
              </button>
            </div>

            <p className="mt-5 text-center text-sm text-cyan-50/75">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-black uppercase tracking-[0.08em] text-[#ffd84a]"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
