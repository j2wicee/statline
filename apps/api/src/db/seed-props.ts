import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sports, statCategories, players, props } from './schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const PLAYERS: Record<string, { name: string; team: string; position: string }[]> = {
    'nba': [
        { name: 'Stephen Curry', team: 'Golden State Warriors', position: 'PG' },
        { name: 'LeBron James', team: 'Los Angeles Lakers', position: 'SF' },
        { name: 'Kyrie Irving', team: 'Dallas Mavericks', position: 'PG' },
        { name: 'Victor Wembanyama', team: 'San Antonio Spurs', position: 'C' }

    ],
    'nfl': [
        { name: 'Patrick Mahomes', team: 'Kansas City Chiefs', position: 'QB' },
        { name: 'Josh Allen', team: 'Buffalo Bills', position: 'QB' },
        { name: 'Tyreek Hill', team: 'Miami Dolphins', position: 'WR' },
        { name: 'Justin Jefferson', team: 'Minnesota Vikings', position: 'WR' },
        { name: 'Christian McCaffrey', team: 'San Francisco 49ers', position: 'RB' },
    ],
    'mlb': [
        { name: 'Shohei Ohtani', team: 'Los Angeles Dodgers', position: 'DH' },
        { name: 'Aaron Judge', team: 'New York Yankees', position: 'OF' },
        { name: 'Freddie Freeman', team: 'Los Angeles Dodgers', position: '1B' },
        { name: 'Pete Alonso', team: 'New York Mets', position: '1B' },
        { name: 'Julio Rodriguez', team: 'Seattle Mariners', position: 'OF' },
    ],
    'nhl': [
        { name: 'Connor McDavid', team: 'Edmonton Oilers', position: 'C' },
        { name: 'Auston Matthews', team: 'Toronto Maple Leafs', position: 'C' },
        { name: 'Nathan MacKinnon', team: 'Colorado Avalanche', position: 'C' },
        { name: 'David Pastrnak', team: 'Boston Bruins', position: 'RW' },
        { name: 'Igor Shesterkin', team: 'New York Rangers', position: 'G' },
    ],

}

const PROPS: Record<string, { statSlug: string; lineValue: number }[]> = {
    'Stephen Curry': [
        { statSlug: 'points', lineValue: 27.5 },
        { statSlug: 'threes_made', lineValue: 4.5 }
    ],
    'LeBron James': [
        { statSlug: 'points', lineValue: 25.5 },
        { statSlug: 'assists', lineValue: 7.5 },
    ],
    'Kyrie Irving': [
        { statSlug: 'points', lineValue: 25.5 },
        { statSlug: 'assists', lineValue: 6.5 }
    ],
    'Victor Wembanyama': [
        { statSlug: 'rebounds', lineValue: 10.5 },
        { statSlug: 'points', lineValue: 19.5 }
    ],
    'Patrick Mahomes': [
        { statSlug: 'passing_yards', lineValue: 287.5 },
        { statSlug: 'passing_tds', lineValue: 2.5 },
    ],
    'Josh Allen': [
        { statSlug: 'passing_yards', lineValue: 265.5 },
        { statSlug: 'rushing_yards', lineValue: 45.5 },
    ],
    'Tyreek Hill': [
        { statSlug: 'receiving_yards', lineValue: 82.5 },
        { statSlug: 'receptions', lineValue: 6.5 },
    ],
    'Justin Jefferson': [
        { statSlug: 'receiving_yards', lineValue: 78.5 },
        { statSlug: 'receptions', lineValue: 5.5 },
    ],
    'Christian McCaffrey': [
        { statSlug: 'rushing_yards', lineValue: 72.5 },
        { statSlug: 'receptions', lineValue: 5.5 },
    ],
    'Shohei Ohtani': [
        { statSlug: 'home_runs', lineValue: 0.5 },
        { statSlug: 'total_bases', lineValue: 1.5 },
    ],
    'Aaron Judge': [
        { statSlug: 'home_runs', lineValue: 0.5 },
        { statSlug: 'rbis', lineValue: 1.5 },
    ],
    'Freddie Freeman': [
        { statSlug: 'total_bases', lineValue: 1.5 },
        { statSlug: 'rbis', lineValue: 1.5 },
    ],
    'Pete Alonso': [
        { statSlug: 'home_runs', lineValue: 0.5 },
        { statSlug: 'rbis', lineValue: 1.5 },
    ],
    'Julio Rodriguez': [
        { statSlug: 'total_bases', lineValue: 1.5 },
        { statSlug: 'rbis', lineValue: 0.5 },
    ],
    'Connor McDavid': [
        { statSlug: 'goals', lineValue: 0.5 },
        { statSlug: 'assists', lineValue: 0.5 },
    ],
    'Auston Matthews': [
        { statSlug: 'goals', lineValue: 0.5 },
        { statSlug: 'shots_on_goal', lineValue: 3.5 },
    ],
    'Nathan MacKinnon': [
        { statSlug: 'points', lineValue: 0.5 },
        { statSlug: 'assists', lineValue: 0.5 },
    ],
    'David Pastrnak': [
        { statSlug: 'goals', lineValue: 0.5 },
        { statSlug: 'shots_on_goal', lineValue: 3.5 },
    ],
    'Igor Shesterkin': [
        { statSlug: 'saves', lineValue: 27.5 },
    ],

}

async function seed() {
    const existingSports = await db.select().from(sports);

    for (const sport of existingSports) {
        const p = PLAYERS[sport.slug];
        if (!p) continue;

        const inserted = await db.insert(players).values(p.map((c) => ({ ...c, sportId: sport.id }))).onConflictDoNothing().returning();
        console.log(`Inserted ${inserted.length} players for ${sport.name}`);

        const stats = await db.select().from(statCategories).where(eq(statCategories.sportId, sport.id))
        for (const player of inserted) {
            const propVal = PROPS[player.name]
            if (!propVal) continue;

            for (const prop of propVal) {
                const statCategory = stats.find((s) => s.slug === prop.statSlug);
                if (!statCategory) continue;

                await db.insert(props).values({
                    playerId: player.id,
                    sportId: sport.id,
                    statCategoryId: statCategory.id,
                    lineValue: String(prop.lineValue),
                    gameDate: new Date().toISOString().split('T')[0],
                }).onConflictDoNothing();
                console.log(`  ${player.name}: ${propVal.length} props inserted`);
            }
        }
    }
    await pool.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});