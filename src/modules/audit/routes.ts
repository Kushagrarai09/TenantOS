import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { allowRoles } from "../../middleware/rbac";
import { TenantRole } from "@prisma/client";

export const auditRouter = Router();
auditRouter.use(authenticate, resolveTenant, allowRoles(TenantRole.OWNER, TenantRole.ADMIN));

auditRouter.get("/", async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.json(logs);
  } catch (error) { return next(error); }
});
