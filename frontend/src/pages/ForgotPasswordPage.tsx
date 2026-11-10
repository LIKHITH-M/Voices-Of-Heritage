import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${FRONTEND_URL}/auth/login`,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(
        code === 'auth/user-not-found' ? "If that email is registered, you'll receive a reset link shortly." :
        code === 'auth/invalid-email' ? 'Invalid email address.' :
        code === 'auth/too-many-requests' ? 'Too many requests. Please wait a moment.' :
        'Something went wrong. Please try again.'
      );
      // Show submitted for not-found too (prevent email enumeration)
      if (code === 'auth/user-not-found') setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4 page-enter">
      <div className="orb orb-blue w-80 h-80 top-[-60px] right-[-60px]" />
      <div className="orb orb-gold w-64 h-64 bottom-[-40px] left-[-40px]" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-3xl font-bold text-voh-text">Forgot Password?</h1>
          <p className="text-voh-muted mt-2 text-sm">Enter your email and we'll send you a reset link.</p>
        </div>
        <div className="glass-card p-8">
          {!submitted ? (
            <>
              {error && <div className="alert-error mb-5"><span>⚠️</span> {error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="voh-label" htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email" type="email" className="voh-input"
                    placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="animate-spin">⏳</span> Sending...</> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-voh-text">Check your inbox</h3>
              <p className="text-voh-muted mt-2 text-sm">
                If <strong>{email}</strong> is registered, you'll receive a password reset email from Firebase shortly.
              </p>
            </div>
          )}
          <p className="text-center text-sm text-voh-muted mt-6">
            Remembered it?{' '}
            <Link to="/auth/login" className="text-voh-accent font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
