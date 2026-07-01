/**
 * SCHEMA — the blueprint for every table in the database.
 *
 * Drizzle reads this file to:
 *   1. Generate SQL migration files (drizzle-kit generate)
 *   2. Give TypeScript full type-safety when you query the DB
 *
 * Think of each `pgTable(...)` call as writing a CREATE TABLE statement,
 * but in TypeScript so the compiler can catch mistakes before they hit prod.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  smallint,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================
// CORE LOOKUP TABLES
// ============================================================

export const sports = pgTable('sports', {
  // uuid() is the column type. primaryKey() = this is the unique row identifier.
  // defaultRandom() tells Postgres to auto-generate a UUID on insert.
  //
  // WHY UUID instead of an auto-increment integer (1, 2, 3...)?
  //   - UUIDs are not guessable. If you expose `/users/3` in a URL, anyone
  //     can try `/users/4`, `/users/5`, etc. UUIDs prevent enumeration.
  //   - UUIDs work across distributed systems (two servers can generate IDs
  //     independently without colliding).
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),  // notNull() = required; Postgres won't allow NULL here
  slug:      text('slug').notNull().unique(), // .unique() adds a UNIQUE constraint to this column
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  //         withTimezone stores UTC. Always store UTC; convert to local time in the UI.
});

export const statCategories = pgTable('stat_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  // .references() creates a FOREIGN KEY constraint.
  // This means sportId MUST match an existing id in the sports table.
  // Postgres enforces this at the DB level — you literally cannot insert a
  // stat_category with a sportId that doesn't exist in sports.
  sportId:   uuid('sport_id').notNull().references(() => sports.id),
  name:      text('name').notNull(),
  slug:      text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // COMPOSITE UNIQUE constraint: sport_id + slug must be unique TOGETHER.
  // This allows "points" to exist in both NBA and NHL, but not twice within the same sport.
  unique('stat_categories_sport_id_slug_unique').on(t.sportId, t.slug),

  // INDEX on sport_id: when you query "get all stat categories for NBA",
  // Postgres uses this index to jump straight to the NBA rows instead of
  // scanning the entire table. Crucial once you have thousands of rows.
  index('stat_categories_sport_id_idx').on(t.sportId),
]);

export const players = pgTable('players', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  team:      text('team').notNull(),
  position:  text('position').notNull(),
  sportId:   uuid('sport_id').notNull().references(() => sports.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('players_sport_id_idx').on(t.sportId),
]);

// ============================================================
// USERS + AUTH
// ============================================================

export const users = pgTable('users', {
  id:       uuid('id').primaryKey().defaultRandom(),
  email:    text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  // We NEVER store the raw password. We store a bcrypt hash of it.
  // bcrypt is a one-way function: given the hash you cannot reverse it to get the password.
  // To verify a login: re-hash the submitted password and compare the two hashes.
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id:     uuid('id').primaryKey().defaultRandom(),
  // onDelete: 'cascade' means: if the parent user row is deleted,
  // automatically delete all their refresh tokens too.
  // Without this, deleting a user would fail due to the FK constraint.
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // We store a SHA-256 hash of the token, not the raw token.
  // If someone breaches the DB, they can't use stolen hashes to authenticate.
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// PROPS + ODDS
// ============================================================

export const props = pgTable('props', {
  id:             uuid('id').primaryKey().defaultRandom(),
  playerId:       uuid('player_id').notNull().references(() => players.id),
  sportId:        uuid('sport_id').notNull().references(() => sports.id),
  statCategoryId: uuid('stat_category_id').notNull().references(() => statCategories.id),
  // numeric() stores exact decimal numbers (no floating-point rounding errors).
  // precision: total digits, scale: digits after the decimal point.
  // e.g. precision:6, scale:1 → up to 99999.9
  lineValue: numeric('line_value', { precision: 6, scale: 1 }).notNull(),
  gameDate:  date('game_date').notNull(), // stores just the date, no time
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // We add an index for each column that will appear in a WHERE clause.
  // Query: "get all props for player X" → needs players index
  // Query: "get all NBA props today" → needs sport_id + game_date indexes
  index('props_player_id_idx').on(t.playerId),
  index('props_sport_id_idx').on(t.sportId),
  index('props_stat_category_id_idx').on(t.statCategoryId),
  index('props_game_date_idx').on(t.gameDate),
]);

// This table is APPEND-ONLY: we never update rows, only insert new ones.
// Each row is a snapshot of what a bookmaker's line was at a specific moment.
// This lets us reconstruct how a line moved over time (line movement charts).
export const oddsLines = pgTable('odds_lines', {
  id:        uuid('id').primaryKey().defaultRandom(),
  propId:    uuid('prop_id').notNull().references(() => props.id),
  bookmaker: text('bookmaker').notNull(),        // e.g. 'DraftKings', 'FanDuel'
  lineValue: numeric('line_value', { precision: 6, scale: 1 }).notNull(),
  overOdds:  smallint('over_odds').notNull(),    // American odds, e.g. -110
  underOdds: smallint('under_odds').notNull(),   // American odds, e.g. -110
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Composite index: most queries will filter by prop AND order by time.
  // e.g. "give me all odds for prop X sorted by recorded_at"
  index('odds_lines_prop_id_recorded_at_idx').on(t.propId, t.recordedAt),
  index('odds_lines_prop_id_bookmaker_recorded_at_idx').on(t.propId, t.bookmaker, t.recordedAt),
]);

// ============================================================
// PICKS
// ============================================================

export const picks = pgTable('picks', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id),
  propId:     uuid('prop_id').notNull().references(() => props.id),
  selection:  text('selection').notNull(),      // 'over' or 'under'
  lineAtPick: numeric('line_at_pick', { precision: 6, scale: 1 }).notNull(),
  // We snapshot the line at the moment the pick is made.
  // The line in the `props` table may change — we need to know what the user
  // actually picked against.
  confidence: smallint('confidence').notNull(), // 1–5 scale
  outcome:    text('outcome').notNull().default('pending'), // 'pending' | 'hit' | 'miss'
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('picks_user_id_idx').on(t.userId),
  index('picks_prop_id_idx').on(t.propId),

  // PARTIAL INDEX: only indexes rows where outcome = 'pending'.
  // Why? Because we'll frequently query "find all pending picks to grade them."
  // Once a pick is 'hit' or 'miss', it never needs to be in this index again.
  // The index stays small and fast even as the table grows to millions of rows.
  index('picks_pending_outcome_idx').on(t.outcome).where(sql`${t.outcome} = 'pending'`),

  // CHECK CONSTRAINTS: the database itself enforces valid values.
  // Even if your API code has a bug, Postgres will reject invalid data.
  check('picks_selection_check',  sql`${t.selection} IN ('over', 'under')`),
  check('picks_confidence_check', sql`${t.confidence} BETWEEN 1 AND 5`),
  check('picks_outcome_check',    sql`${t.outcome} IN ('hit', 'miss', 'pending')`),
]);
