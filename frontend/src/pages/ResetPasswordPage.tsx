import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useEffect } from 'react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!oobCode) { setVerifying(false); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then((emailFromCode) => { setEmail(emailFromCode); setVerifying(false); })
      .catch(() => { setError('This reset link is invalid or has expired.'); setVerifying(false); });
  }, [oobCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, form.password);
      setSuccess('Password reset successfully!');
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(
        code === 'auth/expired-action-code' ? 'Reset link has expired. Please request a new one.' :
        code === 'auth/invalid-action-code' ? 'Reset link is invalid or already used.' :
        code === 'auth/weak-password' ? 'Password is too weak. Use at least 6 characters.' :
        'Reset failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!oobCode) {
    return (
      <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4">
        <div className="glass-card p-10 text-center max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold">Invalid Reset Link</h2>
          <p className="text-voh-muted mt-2 text-sm">No reset code found. Request a new link.</p>
          <Link to="/auth/forgot-password">
            <button className="btn-primary mt-6">Request New Link</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4 page-enter">
      <div className="orb orb-gold w-80 h-80 top-[-60px] left-[-60px]" />
      <div className="orb orb-purple w-64 h-64 bottom-[-40px] right-[-40px]" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-3xl font-bold text-voh-text">Set New Password</h1>
          {email && <p className="text-voh-muted mt-2 text-sm">for <strong>{email}</strong></p>}
        </div>
        <div className="glass-card p-8">
          {verifying && <p className="text-voh-muted text-sm text-center">Verifying link...</p>}
          {!verifying && error && <div className="alert-error mb-5"><span>⚠️</span> {error}</div>}
          {!verifying && success && <div className="alert-success mb-5"><span>✅</span> {success}</div>}
          {!verifying && !error && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="voh-label" htmlFor="new-password">New password</label>
                <input id="new-password" type="password" className="voh-input"
                  placeholder="Min. 6 characters" value={form.password} minLength={6}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <label className="voh-label" htmlFor="confirm-password">Confirm password</label>
                <input id="confirm-password" type="password" className="voh-input"
                  placeholder="Repeat new password" value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><span className="animate-spin">⏳</span> Resetting...</> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
