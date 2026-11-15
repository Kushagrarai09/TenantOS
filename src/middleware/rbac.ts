import { NextFunction, Request, Response } from "express";
import { TenantRole } from "@prisma/client";

export function allowRoles(...roles: TenantRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant || !roles.includes(req.tenant.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
