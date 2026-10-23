import { bigint, boolean, integer, pgTable, serial, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

/** Off-chain campaign metadata, bound to the on-chain campaign by `rulesHash`. Keyed by (contract, campaignId). */
export const campaigns = pgTable(
  'campaigns',
  {
    contract: text('contract').notNull(),
    campaignId: integer('campaign_id').notNull(),
    title: text('title').notNull(),
    brief: text('brief').notNull(),
    brandName: text('brand_name').notNull(),
    brand: text('brand').notNull(),
    token: text('token').notNull(),
    tokenSymbol: text('token_symbol').notNull(),
    tokenDecimals: integer('token_decimals').notNull(),
    assetId: integer('asset_id'),
    rulesHash: text('rules_hash').notNull(),
    minViews: text('min_views').notNull(),
    createTx: text('create_tx').notNull(),
    paidOutAt: timestamp('paid_out_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('campaigns_pk').on(t.contract, t.campaignId)],
);

export const submissions = pgTable(
  'submissions',
  {
    id: serial('id').primaryKey(),
    contract: text('contract').notNull(),
    campaignId: integer('campaign_id').notNull(),
    videoId: text('video_id').notNull(),
    videoUrl: text('video_url').notNull(),
    title: text('title'),
    creator: text('creator').notNull(),
    payoutH160: text('payout_h160').notNull(),
    bindingCode: text('binding_code').notNull(),
    signature: text('signature').notNull(),
    status: text('status', { enum: ['pending', 'verified', 'rejected'] }).notNull().default('pending'),
    rejectReason: text('reject_reason'),
    views: text('views').notNull().default('0'),
    /** Local demo: views set by hand are not overwritten by the mock view source. */
    viewsPinned: boolean('views_pinned').notNull().default(false),
    viewsUpdatedAt: timestamp('views_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('submissions_video').on(t.contract, t.campaignId, t.videoId), index('submissions_creator').on(t.creator)],
);

export const snapshots = pgTable(
  'snapshots',
  {
    contract: text('contract').notNull(),
    campaignId: integer('campaign_id').notNull(),
    json: text('json').notNull(),
    hash: text('hash').notNull(),
    block: integer('block').notNull(),
    extrinsicIndex: integer('extrinsic_index').notNull(),
    storeTx: text('store_tx').notNull(),
    root: text('root').notNull(),
    rootTx: text('root_tx'),
    totalAllocated: text('total_allocated').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('snapshots_pk').on(t.contract, t.campaignId)],
);

export const payouts = pgTable(
  'payouts',
  {
    id: serial('id').primaryKey(),
    contract: text('contract').notNull(),
    campaignId: integer('campaign_id').notNull(),
    account: text('account').notNull(),
    amount: text('amount').notNull(),
    status: text('status', { enum: ['paid', 'failed'] }).notNull(),
    txHash: text('tx_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payouts_campaign').on(t.contract, t.campaignId), index('payouts_account').on(t.account)],
);

export const badges = pgTable(
  'badges',
  {
    collection: integer('collection').notNull(),
    creator: text('creator').notNull(),
    /** pallet-nfts item ids are u32 — wider than Postgres integer. */
    item: bigint('item', { mode: 'number' }).notNull(),
    mintTx: text('mint_tx').notNull(),
    updatedTx: text('updated_tx'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('badges_pk').on(t.collection, t.creator)],
);

/** What the keeper did, for the campaign activity feed. */
export const activity = pgTable(
  'activity',
  {
    id: serial('id').primaryKey(),
    contract: text('contract').notNull(),
    campaignId: integer('campaign_id').notNull(),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    tx: text('tx'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_campaign').on(t.contract, t.campaignId)],
);

/** One-row lease so only one keeper tick runs at a time across serverless instances (single-flight is per process). */
export const keeperLease = pgTable('keeper_lease', {
  id: integer('id').primaryKey(),
  holder: text('holder').notNull(),
  until: timestamp('until', { withTimezone: true }).notNull(),
});

/** Idempotent bootstrap DDL (kept in sync with the tables above) — no migration tooling needed for v1. */
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
  contract text NOT NULL, campaign_id integer NOT NULL, title text NOT NULL, brief text NOT NULL,
  brand_name text NOT NULL, brand text NOT NULL, token text NOT NULL, token_symbol text NOT NULL,
  token_decimals integer NOT NULL, asset_id integer, rules_hash text NOT NULL, min_views text NOT NULL,
  create_tx text NOT NULL, paid_out_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_pk ON campaigns (contract, campaign_id);
CREATE TABLE IF NOT EXISTS submissions (
  id serial PRIMARY KEY, contract text NOT NULL, campaign_id integer NOT NULL, video_id text NOT NULL,
  video_url text NOT NULL, title text, creator text NOT NULL, payout_h160 text NOT NULL, binding_code text NOT NULL,
  signature text NOT NULL, status text NOT NULL DEFAULT 'pending', reject_reason text, views text NOT NULL DEFAULT '0',
  views_updated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_video ON submissions (contract, campaign_id, video_id);
CREATE INDEX IF NOT EXISTS submissions_creator ON submissions (creator);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS views_pinned boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS snapshots (
  contract text NOT NULL, campaign_id integer NOT NULL, json text NOT NULL, hash text NOT NULL, block integer NOT NULL,
  extrinsic_index integer NOT NULL, store_tx text NOT NULL, root text NOT NULL, root_tx text,
  total_allocated text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS snapshots_pk ON snapshots (contract, campaign_id);
CREATE TABLE IF NOT EXISTS payouts (
  id serial PRIMARY KEY, contract text NOT NULL, campaign_id integer NOT NULL, account text NOT NULL,
  amount text NOT NULL, status text NOT NULL, tx_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payouts_campaign ON payouts (contract, campaign_id);
CREATE INDEX IF NOT EXISTS payouts_account ON payouts (account);
CREATE TABLE IF NOT EXISTS badges (
  collection integer NOT NULL, creator text NOT NULL, item bigint NOT NULL, mint_tx text NOT NULL, updated_tx text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE badges ALTER COLUMN item TYPE bigint;
CREATE UNIQUE INDEX IF NOT EXISTS badges_pk ON badges (collection, creator);
CREATE TABLE IF NOT EXISTS activity (
  id serial PRIMARY KEY, contract text NOT NULL, campaign_id integer NOT NULL, kind text NOT NULL, message text NOT NULL,
  tx text, at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_campaign ON activity (contract, campaign_id);
CREATE TABLE IF NOT EXISTS keeper_lease (id integer PRIMARY KEY, holder text NOT NULL, until timestamptz NOT NULL);
`;
