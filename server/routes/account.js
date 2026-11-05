import express from 'express';
import { writeLimiter } from '../middleware/security.js';
import { identify, requireUser, deleteAuthUser } from '../lib/auth.js';
import { query, tx } from '../db/index.js';
import { sendServerError } from '../lib/validation.js';
import { loadPassport } from './passport.js';
import { loadSubscription } from '../lib/entitlements.js';
import { cancelSubscriptionFor, stripeConfigured } from '../lib/stripe.js';
import { deleteRevenueCatUser } from '../lib/revenuecat.js';

const router = express.Router();
router.use(identify, requireUser);

async function touchProfile(user) {
  const { rows } = await query(
    `INSERT INTO roadready.profiles (user_id, email) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, roadready.profiles.email), last_seen_at = now()
     RETURNING created_at`,
    [user.id, user.email]
  );
  return rows[0];
}

// Current account
router.get('/', async (req, res) => {
  try {
    const profile = await touchProfile(req.user);
    res.json({
      id: req.user.id,
      email: req.user.email,
      createdAt: new Date(profile.created_at).toISOString()
    });
  } catch (err) {
    sendServerError(res, 'Failed to load account', err);
  }
});

// Move this device's guest data (sent via X-Client-Id) into the signed-in account.
// Called right after sign-in so practice hours logged before creating an account are kept.
router.post('/claim', writeLimiter, async (req, res) => {
  if (!req.guestOwnerId) {
    return res.status(400).json({ error: 'Send the device X-Client-Id to claim guest data' });
  }
  const userOwner = req.ownerId;
  const guestOwner = req.guestOwnerId;
  try {
    await touchProfile(req.user);
    const moved = await tx(async (q) => {
      const logs = await q.query('UPDATE roadready.drive_logs SET owner_id = $1 WHERE owner_id = $2', [userOwner, guestOwner]);
      await q.query('UPDATE roadready.community_reports SET owner_id = $1 WHERE owner_id = $2', [userOwner, guestOwner]);
      await q.query('UPDATE roadready.instructor_bookings SET owner_id = $1 WHERE owner_id = $2', [userOwner, guestOwner]);
      // A guest plan only moves across where the account has none from that provider.
      await q.query(
        `INSERT INTO roadready.entitlements
           (owner_id, provider, plan, price, currency, unlocked_at, expires_at, will_renew, store,
            external_customer_id, external_ref, updated_at)
         SELECT $1, provider, plan, price, currency, unlocked_at, expires_at, will_renew, store,
                external_customer_id, external_ref, now()
           FROM roadready.entitlements WHERE owner_id = $2
         ON CONFLICT (owner_id, provider) DO NOTHING`,
        [userOwner, guestOwner]
      );
      await q.query('DELETE FROM roadready.entitlements WHERE owner_id = $1', [guestOwner]);
      return { driveLogs: logs.rowCount ?? logs.affectedRows ?? 0 };
    });

    const [passport, subscription] = await Promise.all([loadPassport(userOwner), loadSubscription(userOwner)]);
    res.json({ success: true, moved, passport, subscription });
  } catch (err) {
    sendServerError(res, 'Failed to move guest data into the account', err);
  }
});

// Permanently delete the account and everything linked to it (App Store guideline 5.1.1(v)).
router.delete('/', writeLimiter, async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Account deletion is not configured on this server' });
  }
  const owner = req.ownerId;
  // Stop future web charges first; if Stripe is unreachable, keep everything so the person can retry.
  if (stripeConfigured) {
    try {
      await cancelSubscriptionFor(owner);
    } catch (err) {
      console.error('[api] Failed to cancel Stripe subscription:', err.message);
      return res.status(502).json({ error: 'Could not cancel your monthly plan. Nothing was deleted; please try again.' });
    }
  }
  try {
    await tx(async (q) => {
      await q.query('DELETE FROM roadready.drive_logs WHERE owner_id = $1', [owner]);
      await q.query('DELETE FROM roadready.entitlements WHERE owner_id = $1', [owner]);
      await q.query('DELETE FROM roadready.community_reports WHERE owner_id = $1', [owner]);
      await q.query('DELETE FROM roadready.instructor_bookings WHERE owner_id = $1', [owner]);
      await q.query('DELETE FROM roadready.analytics_events WHERE user_id = $1', [req.user.id]);
      await q.query('DELETE FROM roadready.profiles WHERE user_id = $1', [req.user.id]);
    });
  } catch (err) {
    return sendServerError(res, 'Failed to delete account data', err);
  }
  try {
    await deleteRevenueCatUser(req.user.id);
  } catch (err) {
    // Not fatal: RevenueCat keeps only the anonymous purchase record under this id.
    console.error('[api] Failed to delete RevenueCat customer:', err.message);
  }
  try {
    await deleteAuthUser(req.user.id);
  } catch (err) {
    // Data is already gone; the login itself still exists. Retrying is safe.
    console.error('[api] Failed to delete auth user:', err.message);
    return res.status(502).json({ error: 'Your data was deleted, but removing the login failed. Please try again.' });
  }
  res.json({ success: true });
});

export default router;
