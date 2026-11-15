import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";

export const usageRouter = Router();
usageRouter.use(authenticate, resolveTenant);

usageRouter.post("/events", async (req, res, next) => {
  try {
    const input = z.object({
      eventType: z.string().min(1),
      quantity: z.number().int().positive().default(1),
      idempotencyKey: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }).parse(req.body);

    const event = await prisma.usageEvent.create({
      data: { ...input, tenantId: req.tenant!.id },
    });
    await redis.incrby(`usage:${req.tenant!.id}:${input.eventType}`, input.quantity).catch(() => undefined);
    return res.status(201).json(event);
  } catch (error) { return next(error); }
});

usageRouter.get("/summary", async (req, res, next) => {
  try {
    const grouped = await prisma.usageEvent.groupBy({
      by: ["eventType"],
      where: { tenantId: req.tenant!.id, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { quantity: true },
    });
    return res.json(grouped.map((row) => ({ eventType: row.eventType, quantity: row._sum.quantity ?? 0 })));
  } catch (error) { return next(error); }
});
