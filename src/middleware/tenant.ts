import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return res.status(400).json({ error: "x-tenant-id header is required" });

  const membership = await prisma.membership.findFirst({
    where: { userId: req.user.id, tenantId },
    select: { tenantId: true, role: true },
  });

  if (!membership) return res.status(403).json({ error: "You are not a member of this tenant" });

  req.tenant = { id: membership.tenantId, role: membership.role };
  return next();
}
