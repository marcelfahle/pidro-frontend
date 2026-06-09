import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../api/auth';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Reset link is missing a token');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword(token, password);
      setSession({ accessToken: response.token, user: response.user });
      navigate('/home');
    } catch {
      setError('Reset link is invalid or expired');
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
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                aria-label="New password"
                placeholder="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pidro-input"
                required
              />
              <input
                id="confirm-new-password"
                name="confirm-new-password"
                type="password"
                autoComplete="new-password"
                aria-label="Confirm new password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pidro-input"
                required
              />
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Saving...' : 'Set New Password'}
              </Button>
            </form>
          </div>

          <div className="mt-3">
            <Link to="/login" className="block">
              <Button variant="glass" size="md" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
