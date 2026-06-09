import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import pidroLogoUrl from '../assets/pidro-logo.png';
import { GlassButton, GlassCard, PidroButton, PidroInput } from '../components/ds';
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
          src={pidroLogoUrl}
          alt="Pidro"
          className="pointer-events-none w-[260px] select-none drop-shadow-[0_0_36px_rgba(0,160,255,0.35)] max-sm:mt-5 max-sm:w-[200px]"
        />

        <div className="mt-5 w-full max-w-[380px] max-sm:mt-4">
          <GlassCard style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-3">
              <PidroInput
                id="reg-username"
                name="username"
                type="text"
                autoComplete="username"
                ariaLabel="Username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <PidroInput
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                ariaLabel="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PidroInput
                id="reg-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                ariaLabel="Password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PidroInput
                id="reg-confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                ariaLabel="Confirm password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
              <PidroButton type="submit" disabled={isLoading} fullWidth>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </PidroButton>
            </form>
          </GlassCard>

          <div className="mt-3">
            <Link to="/login" className="block">
              <GlassButton fullWidth>Already have an account? Sign In</GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
