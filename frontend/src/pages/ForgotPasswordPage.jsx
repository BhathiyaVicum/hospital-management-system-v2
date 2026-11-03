import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resendResetCode, verifyResetCode } from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await forgotPassword({ email });
      setMessage(response.message);
      setStep('code');
    } catch (error) {
      setMessage(error.message || 'Unable to process this request.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await verifyResetCode({ email, code });
      navigate('/reset-password');
    } catch (error) {
      setMessage(error.message || 'Unable to verify this code.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await resendResetCode({ email });
      setMessage(response.message);
    } catch (error) {
      setMessage(error.message || 'Unable to resend the code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(8,15,25,0.08)] ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-primary shadow-sm">
            <span className="material-symbols-outlined text-4xl">{step === 'email' ? 'lock_reset' : 'mark_email_read'}</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Identity verification</div>
          <h1 className="mt-3 text-3xl font-semibold text-on-surface">
            {step === 'email' ? 'Reset your password' : 'Enter your reset code'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            {step === 'email'
              ? 'Enter your registered email address. If an account exists, we will send a secure six-digit code.'
              : `Enter the six-digit code sent to ${email}. The code expires after 10 minutes.`}
          </p>
        </div>

        {message && <div role="status" className="mt-6 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">{message}</div>}

        {step === 'email' ? (
          <form onSubmit={requestCode} className="mt-6 space-y-5">
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-on-surface">Registered email address</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </div>
            <button disabled={submitting} type="submit" className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60">
              {submitting ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-5">
            <div>
              <label htmlFor="reset-code" className="mb-2 block text-sm font-medium text-on-surface">Six-digit reset code</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-3 text-center text-lg tracking-[0.4em] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </div>
            <button disabled={submitting || code.length !== 6} type="submit" className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60">
              {submitting ? 'Verifying...' : 'Verify code'}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <button disabled={submitting} type="button" onClick={resendCode} className="font-semibold text-primary disabled:opacity-60">Resend code</button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setMessage(''); }} className="text-on-surface-variant hover:text-on-surface">Change email</button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-on-surface-variant">
          Return to <Link to="/login" className="font-semibold text-primary">sign in</Link>
        </div>
      </div>
    </div>
  );
}
