import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { allowRoles } from "../../middleware/rbac";
import { TenantRole } from "@prisma/client";

export const projectRouter = Router();
projectRouter.use(authenticate, resolveTenant);

projectRouter.get("/", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(projects);
  } catch (error) { return next(error); }
});

projectRouter.post("/", allowRoles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.MEMBER), async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(2), description: z.string().optional() }).parse(req.body);
    const project = await prisma.project.create({ data: { ...input, tenantId: req.tenant!.id } });
    return res.status(201).json(project);
  } catch (error) { return next(error); }
});

projectRouter.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, tenantId: req.tenant!.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json(project);
  } catch (error) { return next(error); }
});

projectRouter.patch("/:id", allowRoles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.MEMBER), async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(2).optional(), description: z.string().optional() }).parse(req.body);
    const result = await prisma.project.updateMany({ where: { id: req.params.id, tenantId: req.tenant!.id }, data: input });
    if (!result.count) return res.status(404).json({ error: "Project not found" });
    const project = await prisma.project.findFirst({ where: { id: req.params.id, tenantId: req.tenant!.id } });
    return res.json(project);
  } catch (error) { return next(error); }
});

projectRouter.delete("/:id", allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    const result = await prisma.project.deleteMany({ where: { id: req.params.id, tenantId: req.tenant!.id } });
    if (!result.count) return res.status(404).json({ error: "Project not found" });
    return res.status(204).send();
  } catch (error) { return next(error); }
});
