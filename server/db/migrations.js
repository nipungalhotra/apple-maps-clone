// Versioned schema migrations. Append new entries; never edit one that has shipped.
//
// Everything lives in the `roadready` schema, not `public`. On Supabase the
// `public` schema is exposed through the auto-generated Data API to anyone with
// the anon key; a separate schema is only reachable through this server.
// Row-level security is also enabled as defence in depth (the server connects
// as the table owner, which bypasses RLS, so this blocks any other role).
//
// owner_id is "user:<supabase user uuid>" for signed-in users or
// "guest:<device client id>" for people who have not created an account yet.

export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial schema',
    sql: `
      CREATE TABLE roadready.profiles (
        user_id uuid PRIMARY KEY,
        email text,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE roadready.drive_logs (
        id uuid PRIMARY KEY,
        owner_id text NOT NULL,
        hours double precision NOT NULL CHECK (hours > 0 AND hours <= 12),
        is_night boolean NOT NULL DEFAULT false,
        is_highway boolean NOT NULL DEFAULT false,
        logged_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX drive_logs_owner_idx ON roadready.drive_logs (owner_id, logged_at DESC);

      CREATE TABLE roadready.subscriptions (
        owner_id text PRIMARY KEY,
        tier text NOT NULL,
        price double precision,
        unlocked_at timestamptz,
        expires_at timestamptz,
        transaction_id text,
        simulated boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE roadready.community_reports (
        id uuid PRIMARY KEY,
        zone_id text NOT NULL,
        owner_id text,
        author text NOT NULL,
        status text NOT NULL,
        surface text NOT NULL,
        notes text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX community_reports_zone_idx ON roadready.community_reports (zone_id, created_at DESC);
      CREATE INDEX community_reports_owner_idx ON roadready.community_reports (owner_id);

      CREATE TABLE roadready.instructor_bookings (
        id uuid PRIMARY KEY,
        owner_id text,
        instructor_id text NOT NULL,
        package_id text NOT NULL,
        student_name text NOT NULL,
        student_phone text NOT NULL,
        time_slot text NOT NULL,
        meeting_location text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'requested',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX instructor_bookings_owner_idx ON roadready.instructor_bookings (owner_id);

      CREATE TABLE roadready.insurance_clicks (
        id uuid PRIMARY KEY,
        partner_id text NOT NULL,
        partner_name text NOT NULL DEFAULT '',
        estimated_savings double precision,
        driver_age double precision,
        logged_hours double precision,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE roadready.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.drive_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.subscriptions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.community_reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.instructor_bookings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.insurance_clicks ENABLE ROW LEVEL SECURITY;
    `
  },
  {
    version: 2,
    name: 'payments: entitlements per provider and webhook event log',
    // One row per owner per payment provider, so a web (Stripe) purchase and an
    // App Store / Play purchase (RevenueCat) never overwrite each other. Pro is
    // active when any row is active. Existing rows from the simulated checkout move over.
    sql: `
      CREATE TABLE roadready.entitlements (
        owner_id text NOT NULL,
        provider text NOT NULL CHECK (provider IN ('simulated', 'stripe', 'revenuecat')),
        plan text NOT NULL,
        price double precision,
        currency text,
        unlocked_at timestamptz,
        expires_at timestamptz,
        will_renew boolean NOT NULL DEFAULT false,
        store text,
        external_customer_id text,
        external_ref text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (owner_id, provider)
      );
      CREATE INDEX entitlements_external_customer_idx ON roadready.entitlements (provider, external_customer_id);

      INSERT INTO roadready.entitlements (owner_id, provider, plan, price, currency, unlocked_at, expires_at, external_ref, updated_at)
        SELECT owner_id, 'simulated', tier, price, 'USD', unlocked_at, expires_at, transaction_id, updated_at
          FROM roadready.subscriptions WHERE tier <> 'free';
      DROP TABLE roadready.subscriptions;

      CREATE TABLE roadready.payment_events (
        provider text NOT NULL,
        event_id text NOT NULL,
        event_type text NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (provider, event_id)
      );

      ALTER TABLE roadready.entitlements ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roadready.payment_events ENABLE ROW LEVEL SECURITY;
    `
  }
];
