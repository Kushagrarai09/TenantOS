import { Router } from "express";
import { z } from "zod";
import { TenantRole } from "@prisma/client";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { allowRoles } from "../../middleware/rbac";

export const userRouter = Router();
userRouter.use(authenticate, resolveTenant);

userRouter.get("/", allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    const members = await prisma.membership.findMany({
      where: { tenantId: req.tenant!.id },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
    });
    return res.json(members);
  } catch (error) { return next(error); }
});

userRouter.patch("/:userId/role", allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.nativeEnum(TenantRole) }).parse(req.body);
    if (req.params.userId === req.user!.id && req.tenant!.role === TenantRole.OWNER) {
      return res.status(400).json({ error: "Owners cannot change their own role" });
    }
    const updated = await prisma.membership.updateMany({
      where: { tenantId: req.tenant!.id, userId: req.params.userId },
      data: { role },
    });
    if (!updated.count) return res.status(404).json({ error: "Member not found" });
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

userRouter.delete("/:userId", allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    if (req.params.userId === req.user!.id) return res.status(400).json({ error: "Cannot remove yourself" });
    const removed = await prisma.membership.deleteMany({
      where: { tenantId: req.tenant!.id, userId: req.params.userId },
    });
    if (!removed.count) return res.status(404).json({ error: "Member not found" });
    return res.status(204).send();
  } catch (error) { return next(error); }
});
