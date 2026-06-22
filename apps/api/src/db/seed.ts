import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sports, statCategories } from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SPORTS = [
  { name: 'Basketball', slug: 'nba' },
  { name: 'American Football', slug: 'nfl' },
  { name: 'Baseball', slug: 'mlb' },
  { name: 'Hockey', slug: 'nhl' },
];

const STAT_CATEGORIES: Record<string, { name: string; slug: string }[]> = {
  nba: [
    { name: 'Points',        slug: 'points' },
    { name: 'Rebounds',      slug: 'rebounds' },
    { name: 'Assists',       slug: 'assists' },
    { name: 'Steals',        slug: 'steals' },
    { name: 'Blocks',        slug: 'blocks' },
    { name: 'Threes Made',   slug: 'threes_made' },
    { name: 'Turnovers',     slug: 'turnovers' },
  ],
  nfl: [
    { name: 'Passing Yards',    slug: 'passing_yards' },
    { name: 'Passing TDs',      slug: 'passing_tds' },
    { name: 'Rushing Yards',    slug: 'rushing_yards' },
    { name: 'Receiving Yards',  slug: 'receiving_yards' },
    { name: 'Receptions',       slug: 'receptions' },
    { name: 'Interceptions',    slug: 'interceptions' },
  ],
  mlb: [
    { name: 'Strikeouts',       slug: 'strikeouts' },
    { name: 'Hits Allowed',     slug: 'hits_allowed' },
    { name: 'Total Bases',      slug: 'total_bases' },
    { name: 'RBIs',             slug: 'rbis' },
    { name: 'Home Runs',        slug: 'home_runs' },
  ],
  nhl: [
    { name: 'Goals',            slug: 'goals' },
    { name: 'Assists',          slug: 'assists' },
    { name: 'Shots on Goal',    slug: 'shots_on_goal' },
    { name: 'Saves',            slug: 'saves' },
    { name: 'Points',           slug: 'points' },
  ],
};

async function seed() {
  console.log('Seeding sports...');

  const insertedSports = await db
    .insert(sports)
    .values(SPORTS)
    .onConflictDoNothing()
    .returning();

  console.log(`  Inserted ${insertedSports.length} sports`);

  console.log('Seeding stat categories...');

  for (const sport of insertedSports) {
    const categories = STAT_CATEGORIES[sport.slug];
    if (!categories) continue;

    const inserted = await db
      .insert(statCategories)
      .values(categories.map((c) => ({ ...c, sportId: sport.id })))
      .onConflictDoNothing()
      .returning();

    console.log(`  ${sport.name}: ${inserted.length} categories`);
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
