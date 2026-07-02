import { Request, Response } from 'express';
import { db } from '../db';
import { props, players, sports, statCategories } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getProps(req: Request, res: Response): Promise<void> {

    const result = await db
        .select()
        .from(props)
        .innerJoin(players, eq(props.playerId, players.id))
        .innerJoin(sports, eq(props.sportId, sports.id))
        .innerJoin(statCategories, eq(props.statCategoryId, statCategories.id));

    res.json({ data: result });
}
