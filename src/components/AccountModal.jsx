import React, { useEffect, useState } from 'react';
import { X, UserRound, Mail, Lock, LogOut, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import {
  accountsEnabled, signIn, signUp, signOut, sendPasswordReset, updatePassword
} from '../services/authService';
import { apiFetch } from '../services/apiConfig';

const MIN_PASSWORD = 8;

const inputClass =
  'w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 ' +
  'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-apple-blue';

const primaryButton =
  'w-full py-2.5 rounded-xl bg-apple-blue text-white text-sm font-bold flex items-center justify-center gap-2 ' +
  'disabled:opacity-60 active:scale-[0.99] transition-all';

function friendlyError(err) {
  const msg = err?.message || '';
  if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered|already been registered/i.test(msg)) return 'An account with this email already exists. Try signing in.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  if (/network|fetch|timeout/i.test(msg)) return 'Could not reach the server. Check your connection and try again.';
  return msg || 'Something went wrong. Please try again.';
}

export default function AccountModal({
  isOpen,
  onClose,
  user,
  initialMode = 'signIn',
  notice = '',
  onAccountDeleted = () => {}
}) {
  const [mode, setMode] = useState(initialMode); // signIn | signUp | reset | newPassword
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOldEnough, setIsOldEnough] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setInfo('');
      setPassword('');
      setShowDelete(false);
      setConfirmDelete('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (mode === 'signIn') {
      return run(async () => {
        await signIn(cleanEmail, password);
        onClose();
      });
    }
    if (mode === 'signUp') {
      if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      if (!isOldEnough) return setError('You must be 13 or older to create an account.');
      return run(async () => {
        const { needsConfirmation } = await signUp(cleanEmail, password);
        if (needsConfirmation) {
          setInfo(`We sent a confirmation link to ${cleanEmail}. Open it, then sign in here.`);
          setMode('signIn');
          setPassword('');
        } else {
          onClose();
        }
      });
    }
    if (mode === 'reset') {
      return run(async () => {
        await sendPasswordReset(cleanEmail);
        setInfo(`If an account exists for ${cleanEmail}, a reset link is on its way.`);
      });
    }
    if (mode === 'newPassword') {
      if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return run(async () => {
        await updatePassword(password);
        setInfo('Password updated.');
        setPassword('');
      });
    }
  };

  const handleSignOut = () => run(async () => {
    await signOut();
    onClose();
  });

  const handleDelete = () => run(async () => {
    await apiFetch('/api/account', { method: 'DELETE', timeoutMs: 20000 });
    await signOut();
    onAccountDeleted();
    onClose();
  });

  const titles = {
    signIn: 'Sign in',
    signUp: 'Create your account',
    reset: 'Reset your password',
    newPassword: 'Choose a new password'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xl animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 my-auto animate-scaleUp">
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-apple-blue/10 text-apple-blue flex items-center justify-center">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="account-modal-title" className="text-lg font-black text-zinc-900 dark:text-white">
                {user && mode !== 'newPassword' ? 'Your account' : titles[mode]}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {user ? 'Your hours and plan are saved to your account.' : 'Keep your practice hours and plan on every device.'}
              </p>
            </div>
          </div>

          {!accountsEnabled && (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-black/5 dark:bg-white/10 rounded-xl px-3 py-2">
              Accounts are not set up in this build. Your progress is saved on this device only.
            </p>
          )}

          {notice && !user && (
            <p className="text-xs font-semibold text-apple-blue bg-apple-blue/10 rounded-xl px-3 py-2">{notice}</p>
          )}
          {info && (
            <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-xl px-3 py-2 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {info}
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {accountsEnabled && user && mode !== 'newPassword' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Signed in as</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white break-all">{user.email}</p>
              </div>

              <button onClick={handleSignOut} disabled={busy} className={primaryButton}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Sign out
              </button>
              <button
                onClick={() => { setMode('newPassword'); setError(''); setInfo(''); }}
                className="w-full text-xs font-semibold text-apple-blue py-1"
              >
                Change password
              </button>

              <div className="pt-3 border-t border-black/5 dark:border-white/10">
                {!showDelete ? (
                  <button
                    onClick={() => setShowDelete(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete account
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      This permanently deletes your account, logged hours, plan and reports. It cannot be undone.
                      A monthly plan bought on our website is cancelled for you. If you subscribed through the
                      App Store or Google Play, cancel it there too, or it will keep renewing.
                      Type <strong>DELETE</strong> to confirm.
                    </p>
                    <input
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value)}
                      aria-label="Type DELETE to confirm"
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowDelete(false); setConfirmDelete(''); }}
                        className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={busy || confirmDelete !== 'DELETE'}
                        className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {busy ? 'Deleting…' : 'Delete forever'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {accountsEnabled && (!user || mode === 'newPassword') && (
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {mode !== 'newPassword' && (
                <label className="block relative">
                  <span className="sr-only">Email</span>
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}

              {mode !== 'reset' && (
                <label className="block relative">
                  <span className="sr-only">{mode === 'newPassword' ? 'New password' : 'Password'}</span>
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'signIn' ? undefined : MIN_PASSWORD}
                    placeholder={mode === 'newPassword' ? 'New password (8+ characters)' : mode === 'signUp' ? 'Password (8+ characters)' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}

              {mode === 'signUp' && (
                <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isOldEnough}
                    onChange={(e) => setIsOldEnough(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I am 13 or older. If I am under 18, a parent or guardian has agreed to my use of RoadReady.</span>
                </label>
              )}

              <button type="submit" disabled={busy} className={primaryButton}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signIn' && 'Sign in'}
                {mode === 'signUp' && 'Create account'}
                {mode === 'reset' && 'Send reset link'}
                {mode === 'newPassword' && 'Save new password'}
              </button>

              <div className="flex items-center justify-between text-xs font-semibold text-apple-blue">
                {mode === 'signIn' && (
                  <>
                    <button type="button" onClick={() => { setMode('signUp'); setError(''); setInfo(''); }}>Create an account</button>
                    <button type="button" onClick={() => { setMode('reset'); setError(''); setInfo(''); }}>Forgot password?</button>
                  </>
                )}
                {(mode === 'signUp' || mode === 'reset') && (
                  <button type="button" onClick={() => { setMode('signIn'); setError(''); setInfo(''); }}>
                    Already have an account? Sign in
                  </button>
                )}
                {mode === 'newPassword' && user && (
                  <button type="button" onClick={() => { setMode('signIn'); setError(''); setInfo(''); }}>Back</button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
