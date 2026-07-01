/**
 * SEED SCRIPT
 *
 * Populates the database with baseline reference data that the app depends on.
 * Sports and stat categories are "lookup tables" — they rarely change and need
 * to exist before any real data (props, picks) can be created.
 *
 * Run with: pnpm --filter @statline/api db:seed
 *
 * IDEMPOTENT: you can run this as many times as you want.
 * onConflictDoNothing() means it skips rows that already exist,
 * so re-running never causes duplicates or errors.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sports, statCategories } from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// The four sports we support. These become rows in the `sports` table.
const SPORTS = [
  { name: 'Basketball',       slug: 'nba' },
  { name: 'American Football', slug: 'nfl' },
  { name: 'Baseball',          slug: 'mlb' },
  { name: 'Hockey',            slug: 'nhl' },
];

// Record<string, T> is a TypeScript utility type meaning:
//   "an object whose keys are strings and values are T"
// Here: an object where each key is a sport slug ('nba', 'nfl', ...)
// and each value is an array of stat category objects.
//
// This lets us look up categories by slug: STAT_CATEGORIES['nba'] → [...NBA stats]
const STAT_CATEGORIES: Record<string, { name: string; slug: string }[]> = {
  nba: [
    { name: 'Points',      slug: 'points' },
    { name: 'Rebounds',    slug: 'rebounds' },
    { name: 'Assists',     slug: 'assists' },
    { name: 'Steals',      slug: 'steals' },
    { name: 'Blocks',      slug: 'blocks' },
    { name: 'Threes Made', slug: 'threes_made' },
    { name: 'Turnovers',   slug: 'turnovers' },
  ],
  nfl: [
    { name: 'Passing Yards',   slug: 'passing_yards' },
    { name: 'Passing TDs',     slug: 'passing_tds' },
    { name: 'Rushing Yards',   slug: 'rushing_yards' },
    { name: 'Receiving Yards', slug: 'receiving_yards' },
    { name: 'Receptions',      slug: 'receptions' },
    { name: 'Interceptions',   slug: 'interceptions' },
  ],
  mlb: [
    { name: 'Strikeouts',  slug: 'strikeouts' },
    { name: 'Hits Allowed', slug: 'hits_allowed' },
    { name: 'Total Bases',  slug: 'total_bases' },
    { name: 'RBIs',         slug: 'rbis' },
    { name: 'Home Runs',    slug: 'home_runs' },
  ],
  nhl: [
    { name: 'Goals',         slug: 'goals' },
    { name: 'Assists',       slug: 'assists' },
    { name: 'Shots on Goal', slug: 'shots_on_goal' },
    { name: 'Saves',         slug: 'saves' },
    { name: 'Points',        slug: 'points' },
  ],
};

async function seed() {
  console.log('Seeding sports...');

  // .insert(sports)     → INSERT INTO sports
  // .values(SPORTS)     → VALUES (row1), (row2), ...
  // .onConflictDoNothing() → if a row with the same unique slug already exists, skip it
  // .returning()        → return the inserted rows so we have access to their generated UUIDs
  //
  // We NEED the UUIDs from this step because stat_categories has a sportId
  // foreign key — we can't hardcode them since Postgres generates them randomly.
  const insertedSports = await db
    .insert(sports)
    .values(SPORTS)
    .onConflictDoNothing()
    .returning();

  console.log(`  Inserted ${insertedSports.length} sports`);

  console.log('Seeding stat categories...');

  for (const sport of insertedSports) {
    const categories = STAT_CATEGORIES[sport.slug]; // e.g. STAT_CATEGORIES['nba']
    if (!categories) continue;

    // .map() transforms each { name, slug } into { name, slug, sportId }.
    // The spread operator (...c) copies all existing properties,
    // then we add sportId to link the category to its sport.
    const inserted = await db
      .insert(statCategories)
      .values(categories.map((c) => ({ ...c, sportId: sport.id })))
      .onConflictDoNothing()
      .returning();

    console.log(`  ${sport.name}: ${inserted.length} categories`);
  }

  console.log('Seed complete.');

  // Always close the pool when a one-off script finishes.
  // Without this, Node.js keeps the process alive waiting for more DB activity.
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1); // exit code 1 signals failure (0 = success)
});
