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
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const statCategories = pgTable('stat_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  sportId:   uuid('sport_id').notNull().references(() => sports.id),
  name:      text('name').notNull(),
  slug:      text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('stat_categories_sport_id_slug_unique').on(t.sportId, t.slug),
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
// USERS
// ============================================================

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  lineValue:      numeric('line_value', { precision: 6, scale: 1 }).notNull(),
  gameDate:       date('game_date').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('props_player_id_idx').on(t.playerId),
  index('props_sport_id_idx').on(t.sportId),
  index('props_stat_category_id_idx').on(t.statCategoryId),
  index('props_game_date_idx').on(t.gameDate),
]);

// Append-only: one row per bookmaker snapshot, never updated in place
export const oddsLines = pgTable('odds_lines', {
  id:         uuid('id').primaryKey().defaultRandom(),
  propId:     uuid('prop_id').notNull().references(() => props.id),
  bookmaker:  text('bookmaker').notNull(),
  lineValue:  numeric('line_value', { precision: 6, scale: 1 }).notNull(),
  overOdds:   smallint('over_odds').notNull(),
  underOdds:  smallint('under_odds').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('odds_lines_prop_id_recorded_at_idx').on(t.propId, t.recordedAt),
  index('odds_lines_prop_id_bookmaker_recorded_at_idx').on(t.propId, t.bookmaker, t.recordedAt),
]);

// ============================================================
// PICKS
// ============================================================

export const picks = pgTable('picks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id),
  propId:      uuid('prop_id').notNull().references(() => props.id),
  selection:   text('selection').notNull(),
  lineAtPick:  numeric('line_at_pick', { precision: 6, scale: 1 }).notNull(),
  confidence:  smallint('confidence').notNull(),
  outcome:     text('outcome').notNull().default('pending'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('picks_user_id_idx').on(t.userId),
  index('picks_prop_id_idx').on(t.propId),
  index('picks_pending_outcome_idx').on(t.outcome).where(sql`${t.outcome} = 'pending'`),
  check('picks_selection_check', sql`${t.selection} IN ('over', 'under')`),
  check('picks_confidence_check', sql`${t.confidence} BETWEEN 1 AND 5`),
  check('picks_outcome_check', sql`${t.outcome} IN ('hit', 'miss', 'pending')`),
]);
