import { Router } from "express";
import { z } from "zod";
import { TenantRole } from "@prisma/client";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { allowRoles } from "../../middleware/rbac";

export const tenantRouter = Router();
tenantRouter.use(authenticate);

tenantRouter.get("/mine", async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: { tenant: true },
    });
    return res.json(memberships.map(({ tenant, role }) => ({ ...tenant, role })));
  } catch (error) { return next(error); }
});

tenantRouter.post("/", async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9-]+$/) }).parse(req.body);
    const tenant = await prisma.tenant.create({
      data: {
        ...input,
        memberships: { create: { userId: req.user!.id, role: TenantRole.OWNER } },
      },
    });
    return res.status(201).json(tenant);
  } catch (error) { return next(error); }
});

tenantRouter.get("/current", resolveTenant, (req, res) => {
  return res.json({ tenantId: req.tenant!.id, role: req.tenant!.role });
});

tenantRouter.patch("/current", resolveTenant, allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(2) }).parse(req.body);
    const tenant = await prisma.tenant.update({ where: { id: req.tenant!.id }, data: input });
    return res.json(tenant);
  } catch (error) { return next(error); }
});
