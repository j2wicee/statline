import { Request, Response } from "express";
import { db } from "../db";
import { picks, props, statCategories, players } from "../db/schema"
import { eq } from "drizzle-orm";

export async function createPick(req: Request, res: Response): Promise<void> {
    const { propId, selection, confidence } = req.body;
    if (!propId || !selection || !confidence) {
        res.status(400).json({ error: 'missing fields' });
        return;
    }
    if (selection !== 'over' && selection !== 'under') {
        res.status(400).json({ error: 'invalid selection' });
        return;
    }
    if (confidence > 5 || confidence < 1) {
        res.status(400).json({ error: 'outside of confidence range' });
        return;
    }

    const [currProp] = await db.select().from(props).where(eq(props.id, propId));
    if (!currProp) {
        res.status(404).json({ error: 'prop not found' });
        return;
    }
    const line = currProp.lineValue;

    const [pick] = await db.insert(picks).values({
        userId: req.user!.userId,
        propId,
        selection,
        confidence,
        lineAtPick: line
    }).returning();
    res.status(201).json({ data: pick });
}
//You need to fetch all picks where userId matches the logged in user,
// joined with props and players so the response includes readable data instead of just UUIDs.
export async function getMyPicks(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await db
        .select()
        .from(picks)
        .innerJoin(props, eq(props.id, picks.propId))
        .innerJoin(players, eq(players.id, props.playerId))
        .where(eq(picks.userId, userId));

    res.json({ data: result });
}