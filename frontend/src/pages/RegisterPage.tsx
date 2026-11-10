import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiClient } from '@/lib/api';

const ROLES = [
  { value: 'user', label: '🧳 Traveller / Visitor', desc: 'Explore & book heritage experiences' },
  { value: 'researcher', label: '📚 Researcher', desc: 'Access archives & research tools' },
  { value: 'guide', label: '🗺️ Heritage Guide', desc: 'Lead tours & manage bookings' },
  { value: 'institution', label: '🎓 Institution', desc: 'School programs & bulk access' },
];

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Create Firebase user
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // 2. Set display name in Firebase
      await updateProfile(result.user, { displayName: form.name });

      // 3. Send verification email
      await sendEmailVerification(result.user, {
        url: `${FRONTEND_URL}/auth/login?verified=true`,
      });

      // 4. Sync profile to our backend with role
      try {
        await apiClient.post('/api/auth/sync', { name: form.name, role: form.role });
      } catch {
        // Backend sync is best-effort; Firebase auth succeeded
      }

      setSuccess("Account created! We've sent a verification link to your email. Please verify before signing in.");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(
        code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
        code === 'auth/invalid-email' ? 'Invalid email address.' :
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4 page-enter">
      <div className="orb orb-purple w-96 h-96 top-[-80px] right-[-80px]" />
      <div className="orb orb-gold w-72 h-72 bottom-[-40px] left-[-40px]" />

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--voh-accent), var(--voh-gold))', boxShadow: '0 0 30px var(--voh-accent-shadow)' }}
          >
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-voh-text">Join the Heritage</h1>
          <p className="text-voh-muted mt-2 text-sm">Create your Voices of Heritage account</p>
        </div>

        <div className="glass-card p-8">
          {error && <div className="alert-error mb-6"><span>⚠️</span> {error}</div>}
          {success && <div className="alert-success mb-6"><span>✅</span> {success}</div>}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="voh-label" htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name" type="text" className="voh-input" placeholder="Arjun Mehta"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required minLength={2}
                />
              </div>
              <div>
                <label className="voh-label" htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email" type="email" className="voh-input" placeholder="you@example.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="voh-label" htmlFor="reg-password">
                  Password <span>(min. 8 chars, one uppercase, one number)</span>
                </label>
                <input
                  id="reg-password" type="password" className="voh-input"
                  placeholder="Create a strong password" minLength={8}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="voh-label">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.value} type="button" id={`role-${r.value}`}
                      onClick={() => setForm({ ...form, role: r.value })}
                      className="text-left p-3 rounded-xl transition-all duration-200"
                      style={{
                        background: form.role === r.value ? 'var(--voh-accent-15)' : 'var(--voh-surface-overlay)',
                        border: `1px solid ${form.role === r.value ? 'var(--voh-accent-25)' : 'var(--voh-border-strong)'}`,
                      }}
                    >
                      <div className="text-sm font-medium text-voh-text">{r.label}</div>
                      <div className="text-xs text-voh-muted mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><span className="animate-spin">⏳</span> Creating account...</> : 'Create account'}
              </button>
            </form>
          )}

          {success && (
            <button className="btn-primary mt-2" onClick={() => navigate('/auth/login')}>
              Go to login
            </button>
          )}

          <p className="text-center text-sm text-voh-muted mt-6">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-voh-accent font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
