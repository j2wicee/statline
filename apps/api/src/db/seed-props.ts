import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sports, statCategories, players, props, picks, oddsLines } from './schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const PLAYERS: Record<string, { name: string; team: string; position: string }[]> = {
    'nba': [
        { name: 'Stephen Curry',           team: 'Golden State Warriors',  position: 'PG' },
        { name: 'LeBron James',            team: 'Los Angeles Lakers',     position: 'SF' },
        { name: 'Kyrie Irving',            team: 'Dallas Mavericks',       position: 'PG' },
        { name: 'Victor Wembanyama',       team: 'San Antonio Spurs',      position: 'C'  },
        { name: 'Nikola Jokic',            team: 'Denver Nuggets',         position: 'C'  },
        { name: 'Luka Doncic',            team: 'Dallas Mavericks',       position: 'PG' },
        { name: 'Giannis Antetokounmpo',  team: 'Milwaukee Bucks',        position: 'PF' },
        { name: 'Jayson Tatum',            team: 'Boston Celtics',         position: 'SF' },
        { name: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder',  position: 'PG' },
        { name: 'Kevin Durant',            team: 'Phoenix Suns',           position: 'SF' },
        { name: 'Tyrese Haliburton',       team: 'Indiana Pacers',         position: 'PG' },
    ],
    'nfl': [
        { name: 'Patrick Mahomes',     team: 'Kansas City Chiefs',      position: 'QB' },
        { name: 'Josh Allen',          team: 'Buffalo Bills',            position: 'QB' },
        { name: 'Lamar Jackson',       team: 'Baltimore Ravens',         position: 'QB' },
        { name: 'Joe Burrow',          team: 'Cincinnati Bengals',       position: 'QB' },
        { name: 'Tyreek Hill',         team: 'Miami Dolphins',           position: 'WR' },
        { name: 'Justin Jefferson',    team: 'Minnesota Vikings',        position: 'WR' },
        { name: 'CeeDee Lamb',         team: 'Dallas Cowboys',           position: 'WR' },
        { name: 'Ja\'Marr Chase',      team: 'Cincinnati Bengals',       position: 'WR' },
        { name: 'Travis Kelce',        team: 'Kansas City Chiefs',       position: 'TE' },
        { name: 'Christian McCaffrey', team: 'San Francisco 49ers',      position: 'RB' },
        { name: 'Stefon Diggs',        team: 'Buffalo Bills',            position: 'WR' },
    ],
    'mlb': [
        { name: 'Shohei Ohtani',       team: 'Los Angeles Dodgers',  position: 'DH' },
        { name: 'Aaron Judge',         team: 'New York Yankees',      position: 'OF' },
        { name: 'Freddie Freeman',     team: 'Los Angeles Dodgers',   position: '1B' },
        { name: 'Pete Alonso',         team: 'New York Mets',         position: '1B' },
        { name: 'Julio Rodriguez',     team: 'Seattle Mariners',      position: 'OF' },
        { name: 'Mookie Betts',        team: 'Los Angeles Dodgers',   position: 'OF' },
        { name: 'Ronald Acuna Jr.',    team: 'Atlanta Braves',        position: 'OF' },
        { name: 'Yordan Alvarez',      team: 'Houston Astros',        position: 'DH' },
        { name: 'Gerrit Cole',         team: 'New York Yankees',      position: 'SP' },
        { name: 'Spencer Strider',     team: 'Atlanta Braves',        position: 'SP' },
        { name: 'Corbin Burnes',       team: 'Baltimore Orioles',     position: 'SP' },
    ],
    'nhl': [
        { name: 'Connor McDavid',    team: 'Edmonton Oilers',        position: 'C'  },
        { name: 'Auston Matthews',   team: 'Toronto Maple Leafs',    position: 'C'  },
        { name: 'Nathan MacKinnon', team: 'Colorado Avalanche',     position: 'C'  },
        { name: 'David Pastrnak',    team: 'Boston Bruins',          position: 'RW' },
        { name: 'Igor Shesterkin',   team: 'New York Rangers',       position: 'G'  },
        { name: 'Leon Draisaitl',    team: 'Edmonton Oilers',        position: 'LW' },
        { name: 'Nikita Kucherov',   team: 'Tampa Bay Lightning',    position: 'RW' },
        { name: 'Cale Makar',        team: 'Colorado Avalanche',     position: 'D'  },
        { name: 'Sidney Crosby',     team: 'Pittsburgh Penguins',    position: 'C'  },
        { name: 'Alex Ovechkin',     team: 'Washington Capitals',    position: 'LW' },
        { name: 'Andrei Vasilevskiy', team: 'Tampa Bay Lightning',   position: 'G'  },
    ],
};

const PROPS: Record<string, { statSlug: string; lineValue: number }[]> = {
    // NBA — lines based on 2023-24 season averages
    'Stephen Curry':           [{ statSlug: 'points', lineValue: 26.5 }, { statSlug: 'threes_made', lineValue: 4.5 }],
    'LeBron James':            [{ statSlug: 'points', lineValue: 24.5 }, { statSlug: 'assists',     lineValue: 8.5 }],
    'Kyrie Irving':            [{ statSlug: 'points', lineValue: 24.5 }, { statSlug: 'assists',     lineValue: 5.5 }],
    'Victor Wembanyama':       [{ statSlug: 'points', lineValue: 22.5 }, { statSlug: 'rebounds',    lineValue: 10.5 }, { statSlug: 'blocks', lineValue: 3.5 }],
    'Nikola Jokic':            [{ statSlug: 'points', lineValue: 26.5 }, { statSlug: 'rebounds',    lineValue: 12.5 }, { statSlug: 'assists', lineValue: 9.5 }],
    'Luka Doncic':             [{ statSlug: 'points', lineValue: 28.5 }, { statSlug: 'assists',     lineValue: 8.5 }, { statSlug: 'rebounds', lineValue: 8.5 }],
    'Giannis Antetokounmpo':   [{ statSlug: 'points', lineValue: 30.5 }, { statSlug: 'rebounds',    lineValue: 11.5 }],
    'Jayson Tatum':            [{ statSlug: 'points', lineValue: 27.5 }, { statSlug: 'assists',     lineValue: 4.5 }],
    'Shai Gilgeous-Alexander': [{ statSlug: 'points', lineValue: 31.5 }, { statSlug: 'assists',     lineValue: 6.5 }],
    'Kevin Durant':            [{ statSlug: 'points', lineValue: 27.5 }, { statSlug: 'rebounds',    lineValue: 6.5 }],
    'Tyrese Haliburton':       [{ statSlug: 'points', lineValue: 20.5 }, { statSlug: 'assists',     lineValue: 10.5 }],

    // NFL — lines based on 2023 season averages per game
    'Patrick Mahomes':     [{ statSlug: 'passing_yards', lineValue: 295.5 }, { statSlug: 'passing_tds',     lineValue: 2.5 }],
    'Josh Allen':          [{ statSlug: 'passing_yards', lineValue: 272.5 }, { statSlug: 'rushing_yards',   lineValue: 38.5 }],
    'Lamar Jackson':       [{ statSlug: 'passing_yards', lineValue: 218.5 }, { statSlug: 'rushing_yards',   lineValue: 62.5 }],
    'Joe Burrow':          [{ statSlug: 'passing_yards', lineValue: 262.5 }, { statSlug: 'passing_tds',     lineValue: 2.5 }],
    'Tyreek Hill':         [{ statSlug: 'receiving_yards', lineValue: 88.5 }, { statSlug: 'receptions',     lineValue: 7.5 }],
    'Justin Jefferson':    [{ statSlug: 'receiving_yards', lineValue: 82.5 }, { statSlug: 'receptions',     lineValue: 6.5 }],
    'CeeDee Lamb':         [{ statSlug: 'receiving_yards', lineValue: 88.5 }, { statSlug: 'receptions',     lineValue: 7.5 }],
    'Ja\'Marr Chase':      [{ statSlug: 'receiving_yards', lineValue: 78.5 }, { statSlug: 'receptions',     lineValue: 5.5 }],
    'Travis Kelce':        [{ statSlug: 'receiving_yards', lineValue: 68.5 }, { statSlug: 'receptions',     lineValue: 5.5 }],
    'Christian McCaffrey': [{ statSlug: 'rushing_yards',   lineValue: 78.5 }, { statSlug: 'receptions',     lineValue: 6.5 }],
    'Stefon Diggs':        [{ statSlug: 'receiving_yards', lineValue: 72.5 }, { statSlug: 'receptions',     lineValue: 5.5 }],

    // MLB — per game lines (HR props are always 0.5, total bases vary)
    'Shohei Ohtani':    [{ statSlug: 'home_runs',    lineValue: 0.5 }, { statSlug: 'total_bases', lineValue: 2.5 }],
    'Aaron Judge':      [{ statSlug: 'home_runs',    lineValue: 0.5 }, { statSlug: 'total_bases', lineValue: 2.5 }],
    'Freddie Freeman':  [{ statSlug: 'total_bases',  lineValue: 2.5 }, { statSlug: 'rbis',        lineValue: 1.5 }],
    'Pete Alonso':      [{ statSlug: 'home_runs',    lineValue: 0.5 }, { statSlug: 'rbis',        lineValue: 1.5 }],
    'Julio Rodriguez':  [{ statSlug: 'total_bases',  lineValue: 1.5 }, { statSlug: 'rbis',        lineValue: 0.5 }],
    'Mookie Betts':     [{ statSlug: 'total_bases',  lineValue: 2.5 }, { statSlug: 'rbis',        lineValue: 1.5 }],
    'Ronald Acuna Jr.': [{ statSlug: 'total_bases',  lineValue: 2.5 }, { statSlug: 'home_runs',   lineValue: 0.5 }],
    'Yordan Alvarez':   [{ statSlug: 'total_bases',  lineValue: 2.5 }, { statSlug: 'rbis',        lineValue: 1.5 }],
    'Gerrit Cole':      [{ statSlug: 'strikeouts',   lineValue: 7.5 }, { statSlug: 'hits_allowed', lineValue: 5.5 }],
    'Spencer Strider':  [{ statSlug: 'strikeouts',   lineValue: 8.5 }, { statSlug: 'hits_allowed', lineValue: 4.5 }],
    'Corbin Burnes':    [{ statSlug: 'strikeouts',   lineValue: 6.5 }, { statSlug: 'hits_allowed', lineValue: 5.5 }],

    // NHL — goals/assists are always 0.5 since scoring per game is low
    'Connor McDavid':     [{ statSlug: 'goals',  lineValue: 0.5 }, { statSlug: 'assists',       lineValue: 1.5 }],
    'Auston Matthews':    [{ statSlug: 'goals',  lineValue: 0.5 }, { statSlug: 'shots_on_goal', lineValue: 4.5 }],
    'Nathan MacKinnon':   [{ statSlug: 'points', lineValue: 1.5 }, { statSlug: 'assists',       lineValue: 1.5 }],
    'David Pastrnak':     [{ statSlug: 'goals',  lineValue: 0.5 }, { statSlug: 'shots_on_goal', lineValue: 4.5 }],
    'Igor Shesterkin':    [{ statSlug: 'saves',  lineValue: 29.5 }],
    'Leon Draisaitl':     [{ statSlug: 'goals',  lineValue: 0.5 }, { statSlug: 'assists',       lineValue: 1.5 }],
    'Nikita Kucherov':    [{ statSlug: 'points', lineValue: 1.5 }, { statSlug: 'assists',       lineValue: 1.5 }],
    'Cale Makar':         [{ statSlug: 'points', lineValue: 1.5 }, { statSlug: 'shots_on_goal', lineValue: 2.5 }],
    'Sidney Crosby':      [{ statSlug: 'points', lineValue: 1.5 }, { statSlug: 'assists',       lineValue: 1.5 }],
    'Alex Ovechkin':      [{ statSlug: 'goals',  lineValue: 0.5 }, { statSlug: 'shots_on_goal', lineValue: 3.5 }],
    'Andrei Vasilevskiy': [{ statSlug: 'saves',  lineValue: 28.5 }],
};

async function seed() {
    // Clean up existing data first so re-running doesn't create duplicates.
    // Order matters — delete child tables before parent tables (FK constraints).
    console.log('Cleaning up existing data...');
    await db.delete(picks);
    await db.delete(oddsLines);
    await db.delete(props);
    await db.delete(players);
    console.log('Done.\n');

    const existingSports = await db.select().from(sports);

    for (const sport of existingSports) {
        const p = PLAYERS[sport.slug];
        if (!p) continue;

        const inserted = await db
            .insert(players)
            .values(p.map((c) => ({ ...c, sportId: sport.id })))
            .returning();
        console.log(`Inserted ${inserted.length} players for ${sport.name}`);

        const stats = await db.select().from(statCategories).where(eq(statCategories.sportId, sport.id));

        for (const player of inserted) {
            const propVal = PROPS[player.name];
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
                });
            }
            console.log(`  ${player.name}: ${propVal.length} props`);
        }
    }

    console.log('\nSeed complete.');
    await pool.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
