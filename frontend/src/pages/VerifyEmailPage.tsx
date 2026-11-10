import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'info'>(
    oobCode && mode === 'verifyEmail' ? 'loading' : 'info'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!oobCode || mode !== 'verifyEmail') return;
    applyActionCode(auth, oobCode)
      .then(() => {
        // Reload the user so emailVerified updates
        auth.currentUser?.reload();
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.code === 'auth/expired-action-code' ? 'Verification link has expired. Please register again.' :
          err.code === 'auth/invalid-action-code' ? 'Invalid or already-used verification link.' :
          'Verification failed. The link may have expired.'
        );
      });
  }, [oobCode, mode]);

  return (
    <main className="min-h-screen bg-heritage-gradient flex items-center justify-center p-4 page-enter">
      <div className="orb orb-gold w-80 h-80 top-[-60px] left-[-60px]" />
      <div className="orb orb-blue w-72 h-72 bottom-[-40px] right-[-40px]" />
      <div className="w-full max-w-md text-center">
        <div className="glass-card p-10">
          {status === 'loading' && (
            <>
              <div className="text-5xl mb-4 animate-pulse-slow">🔍</div>
              <h2 className="text-xl font-semibold text-voh-text">Verifying your email...</h2>
              <p className="text-voh-muted mt-2 text-sm">Please wait a moment.</p>
            </>
          )}
          {status === 'info' && (
            <>
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-voh-text">Check your inbox</h2>
              <p className="text-voh-muted mt-2 text-sm">
                We sent a verification email to your address. Click the link in the email to verify your account.
              </p>
              <Link to="/auth/login">
                <button className="btn-ghost mt-8">Back to Login</button>
              </Link>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-voh-text">Email Verified!</h2>
              <p className="text-voh-muted mt-2 text-sm">{message}</p>
              <Link to="/auth/login">
                <button id="btn-go-login" className="btn-primary mt-8">Go to Login</button>
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-voh-text">Verification Failed</h2>
              <p className="text-voh-muted mt-2 text-sm">{message}</p>
              <Link to="/auth/register">
                <button id="btn-back-register" className="btn-ghost mt-8">Back to Register</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
