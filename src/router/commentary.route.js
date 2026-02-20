import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, limitCommentaryQuerySchema } from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({ error: "Invalid match id", details: paramsResult.error.issues })
    }

    const queryResult = limitCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult) {
        return res.status(400).json({ error: "Invalid query parameters.", details: queryResult.error.issues })
    }

    try {
        const { id: matchId } = paramsResult.data
        const { limit = 10 } = queryResult.data

        const safeLimit = Math.min(limit, MAX_LIMIT);
        const results = await db.select()
                            .from(commentary)
                            .where(eq(commentary.matchId, matchId))
                            .orderBy(desc(commentary.createdAt))
                            .limit(safeLimit) 
        
        return res.status(200).json({ data: results })

    } catch (err) {
        console.error("Failed to fetch commentary: ", err);
        return res.status(500).json({ error: "Failed to fetch commentary." })
    }
})

commentaryRouter.post("/", async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({ error: "Invalid match id", details: paramsResult.error.issues })
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);
    if (!bodyResult.success) {
        return res.status(400).json({ error: "Invalid commentary payload", details: bodyResult.error.issues })
    }

    try {
        const { minutes, ...rest} = bodyResult.data;
        const [result] = await db.insert(commentary).values({
            matchId: paramsResult.data.id,
            minutes: minutes,
            ...rest
        }).returning();

        return res.status(200).json({ data: result })
    } catch (err) {
        console.error("Failed to create commentary: ", err);
        return res.status(500).json({ error: "Failed to create commentary."})
    }

})