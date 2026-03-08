import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { Button } from '../components/ui/Button';
import { PidroWordmark } from '../components/ui/PidroWordmark';
import { useAuthStore } from '../stores/auth';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  const validate = (): string | null => {
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!email.includes('@')) return 'Please enter a valid email address';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.register(username, email, password);
      setSession({ accessToken: response.token, user: response.user });
      navigate('/home');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pidro-page">
      <div className="pidro-window min-h-[760px]">
        <div className="pidro-titlebar">Pidro</div>
        <div className="pidro-auth-grid relative gap-8 px-6 pb-8 pt-10 max-md:px-4 max-md:pt-8">
          <section className="flex flex-col items-center justify-center gap-6 px-2 text-center max-md:px-0">
            <PidroWordmark />
            <div className="max-w-md space-y-3">
              <h1 className="text-3xl font-black uppercase tracking-[0.08em] text-white">
                Build your table identity
              </h1>
              <p className="text-sm leading-6 text-cyan-50/80">
                Create an account once, then use it across the web table and the mobile client we
                tackle next. Same room flow, same seat logic, same old-school feel.
              </p>
            </div>
          </section>

          <section className="flex items-center">
            <div className="pidro-panel pidro-panel--glow w-full p-6 max-md:p-5">
              <div className="mb-5 flex justify-center">
                <div className="pidro-banner">Create Account</div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pidro-input"
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pidro-input"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pidro-input"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-cyan-50/80"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pidro-input"
                    placeholder="Repeat your password"
                    required
                  />
                </div>
                {error && <p className="text-sm font-bold text-red-200">{error}</p>}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
              <p className="mt-5 text-center text-sm text-cyan-50/75">
                Already have an account?{' '}
                <Link to="/login" className="font-black uppercase tracking-[0.08em] text-[#ffd84a]">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
