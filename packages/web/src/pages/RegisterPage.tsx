import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
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
      <div className="pidro-window flex h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-5 py-4 max-sm:justify-start max-sm:px-4 max-sm:pt-0">
        <img
          src={homeLogoUrl}
          alt="Pidro"
          className="pointer-events-none w-[600px] max-w-none select-none max-sm:w-[420px]"
        />

        <div className="-mt-8 w-full max-w-[380px] max-sm:-mt-12">
          <div className="pidro-panel pidro-panel--glow p-5 max-sm:p-4">
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-3">
              <input
                id="reg-username"
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
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                aria-label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pidro-input"
                required
              />
              <input
                id="reg-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                aria-label="Password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pidro-input"
                required
              />
              <input
                id="reg-confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-label="Confirm password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pidro-input"
                required
              />
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </div>

          <div className="mt-3">
            <Link to="/login" className="block">
              <Button variant="glass" size="md" className="w-full">
                Already have an account? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
