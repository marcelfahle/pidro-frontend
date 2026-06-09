import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import homeLogoUrl from '../assets/legacy/home-logo.png';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth';

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);

    if (!identifier.trim()) {
      setError('Enter your username or email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.requestPasswordReset(identifier.trim());
      setMessage(response.message);
      setDevResetUrl(response.reset_url ?? null);
    } catch {
      setError('Unable to request a reset link. Try again.');
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
                id="reset-identifier"
                name="username"
                type="text"
                autoComplete="username"
                aria-label="Username or email"
                placeholder="Username or email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="pidro-input"
                required
              />
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              {message && <p className="text-sm font-bold text-cyan-50/80">{message}</p>}
              {devResetUrl && (
                <Link
                  to={new URL(devResetUrl).pathname + new URL(devResetUrl).search}
                  className="block text-sm font-bold text-amber-200 underline underline-offset-4"
                >
                  Open local reset link
                </Link>
              )}
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Sending...' : 'Send Reset Link'}
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
