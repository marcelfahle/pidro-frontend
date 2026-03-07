import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { Button } from '../components/ui/Button';
import { PidroWordmark } from '../components/ui/PidroWordmark';
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
      <div className="pidro-window min-h-[720px]">
        <div className="pidro-titlebar">Pidro</div>
        <div className="pidro-auth-grid relative gap-8 px-6 pb-8 pt-10 max-md:px-4 max-md:pt-8">
          <section className="flex flex-col justify-between gap-8 px-2 py-4 max-md:px-0">
            <div className="flex flex-col items-center gap-6 text-center">
              <PidroWordmark className="mt-4" />
              <p className="max-w-md text-sm leading-6 text-cyan-50/80">
                The legacy table feel, rebuilt for the browser. Sign in to jump into multiplayer,
                create a room, and keep the whole board playable in portrait or landscape.
              </p>
            </div>

            <div className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-4">
              <div className="min-w-[220px] rounded-[18px] border-2 border-[#d98d18] bg-[linear-gradient(180deg,rgba(255,213,88,0.22)_0%,transparent_36%),linear-gradient(180deg,#6d3000_0%,#4a1900_38%,#2f1100_100%)] px-8 py-4 text-center shadow-[0_10px_20px_rgba(23,7,0,0.28)]">
                <div className="text-2xl font-black uppercase tracking-[0.05em] text-[#ffd84a]">
                  Multiplayer
                </div>
              </div>
              <div className="min-w-[220px] rounded-[18px] border border-cyan-300/30 bg-cyan-950/30 px-8 py-4 text-center text-cyan-50/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="text-2xl font-black uppercase tracking-[0.05em]">Single Player</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-100/55">
                  Coming later
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <div className="pidro-panel pidro-panel--glow w-full p-6 max-md:p-5">
              <div className="mb-5 flex justify-center">
                <div className="pidro-banner">Enter Multiplayer</div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pidro-input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
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

              <p className="mt-5 text-center text-sm text-cyan-50/75">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-black uppercase tracking-[0.08em] text-[#ffd84a]">
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
