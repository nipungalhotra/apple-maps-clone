import { createClient } from '@supabase/supabase-js';

// Accounts use Supabase Auth. When these are not set the app runs in guest-only mode.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Supabase calls this the "publishable" (new) or "anon" (legacy) key. It is safe to ship in the app.
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = accountsEnabled
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Email links (confirm / reset password) come back to the web app with the session in the URL.
        detectSessionInUrl: true
      }
    })
  : null;

const notConfigured = () => new Error('Accounts are not available in this build');

// Where email links (confirm sign-up, reset password) send people back to.
const redirectTo = () =>
  import.meta.env.VITE_AUTH_REDIRECT_URL ||
  (typeof window !== 'undefined' && window.location.protocol.startsWith('http') ? window.location.origin : undefined);

/** Current access token, refreshed by supabase-js when needed. Null for guests. */
export async function getAccessToken() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

/**
 * Subscribe to sign-in / sign-out events. The callback runs on the next tick:
 * supabase-js holds an internal lock while notifying listeners, and calling
 * supabase.auth.* (which every API request does to read the token) from inside
 * the listener would deadlock.
 */
export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => callback(event, session?.user || null), 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUp(email, password) {
  if (!supabase) throw notConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo() }
  });
  if (error) throw error;
  // With email confirmation on (recommended), there is no session until the link is clicked.
  return { user: data.user, needsConfirmation: !data.session };
}

export async function signIn(email, password) {
  if (!supabase) throw notConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function sendPasswordReset(email) {
  if (!supabase) throw notConfigured();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw error;
}

export async function updatePassword(password) {
  if (!supabase) throw notConfigured();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  // 'local' clears this device only; the session on other devices stays valid.
  // supabase-js reports failures (e.g. offline) as a return value, not a throw.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
