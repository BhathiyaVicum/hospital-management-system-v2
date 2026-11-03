import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resendVerification, verifyEmail } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromLink = searchParams.get('email') || '';
  const tokenFromLink = searchParams.get('token') || '';
  const [email, setEmail] = useState(emailFromLink);
  const [token, setToken] = useState(tokenFromLink);
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitted = useRef(false);

  const verifyToken = useCallback(async (value) => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await verifyEmail({ email: email.trim().toLowerCase(), token: value });
      setVerified(true);
      setMessage(response.message || 'Email verified successfully.');
      setToken('');
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true });
    } catch (error) {
      setMessage(error.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  }, [email, navigate]);

  useEffect(() => {
    if (tokenFromLink && emailFromLink && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verifyToken(tokenFromLink);
    }
  }, [emailFromLink, tokenFromLink, verifyToken]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await verifyToken(token);
  };

  const handleResend = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await resendVerification({ email: email.trim().toLowerCase() });
      setMessage(response.message || 'If the account can be verified, a verification link will be sent.');
    } catch (error) {
      setMessage(error.message || 'Unable to resend verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(8,15,25,0.08)] ring-1 ring-slate-200 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container text-primary shadow-sm">
            <span className="material-symbols-outlined text-5xl">{verified ? 'mark_email_read' : 'mark_email_unread'}</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Email verification</div>
          <h1 className="mt-3 text-3xl font-semibold text-on-surface">{verified ? 'Email verified' : 'Verify your email address'}</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            {verified
              ? 'Your account is ready. Sign in to continue.'
              : 'Use the secure link sent to your email. If you have a verification token, you can enter it below.'}
          </p>
        </div>

        {message && (
          <div role={verified ? 'status' : 'alert'} className="mb-5 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">
            {message}
          </div>
        )}

        {!verified && (
          <>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="verification-email" className="mb-2 block text-sm font-medium text-on-surface">Email address</label>
                <input
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>
              <div>
                <label htmlFor="verification-token" className="mb-2 block text-sm font-medium text-on-surface">Verification token</label>
                <input
                  id="verification-token"
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value.trim())}
                  placeholder="Paste the secure verification token"
                  className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>
              <button disabled={submitting} type="submit" className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60">
                {submitting ? 'Verifying...' : 'Confirm verification'}
              </button>
            </form>

            <button type="button" disabled={submitting || !email} onClick={handleResend} className="mt-5 text-sm font-semibold text-primary disabled:opacity-60">
              Resend verification link
            </button>
          </>
        )}

        <div className="mt-6 text-center text-sm text-on-surface-variant">
          {verified ? (
            <Link to="/login" className="font-semibold text-primary">Sign in</Link>
          ) : (
            <>Need help? <Link to="/login" className="font-semibold text-primary">Return to sign in</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
