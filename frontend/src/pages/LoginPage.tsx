import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(
        code === 'auth/invalid-credential' ? 'Invalid email or password.' :
        code === 'auth/user-not-found' ? 'No account found with this email.' :
        code === 'auth/wrong-password' ? 'Incorrect password.' :
        code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.' :
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4 page-enter">
      <div className="orb orb-gold w-96 h-96 top-[-80px] left-[-80px]" />
      <div className="orb orb-blue w-80 h-80 bottom-[-60px] right-[-60px]" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--voh-accent), var(--voh-gold))', boxShadow: '0 0 30px var(--voh-accent-shadow)' }}
          >
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-voh-text">Welcome back</h1>
          <p className="text-voh-muted mt-2 text-sm">Sign in to Voices of Heritage</p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="alert-error mb-6">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="voh-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="voh-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="voh-label" style={{ margin: 0 }} htmlFor="password">Password</label>
                <Link to="/auth/forgot-password" className="text-xs text-voh-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="voh-input"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || googleLoading}>
              {loading ? <><span className="animate-spin">⏳</span> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <div className="divider-text">or continue with</div>

          <button
            id="btn-google-login"
            className="btn-ghost"
            onClick={handleGoogle}
            type="button"
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <><span className="animate-spin">⏳</span> Opening Google...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.9c1.76 0 3.32.65 4.55 1.7l3.4-3.4A12 12 0 0 0 12 0C7.37 0 3.36 2.7 1.44 6.64l3.83 3.12Z" />
                  <path fill="#FBBC05" d="M16.04 18.01A7.06 7.06 0 0 1 12 19.1c-2.9 0-5.4-1.74-6.63-4.27l-3.84 2.96A12 12 0 0 0 12 24c3.23 0 6.18-1.19 8.44-3.12l-4.4-2.87Z" />
                  <path fill="#4285F4" d="M23.76 12.27c0-.84-.08-1.67-.21-2.47H12v4.67h6.61a5.65 5.65 0 0 1-2.44 3.7l4.4 2.87c2.57-2.37 4.19-5.9 4.19-10.77Z" />
                  <path fill="#34A853" d="M5.37 14.83A7.17 7.17 0 0 1 4.9 12c0-.98.17-1.92.47-2.79L1.54 6.09A11.98 11.98 0 0 0 0 12c0 1.99.48 3.87 1.32 5.53l4.05-2.7Z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="text-center text-sm text-voh-muted mt-6">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-voh-accent font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
