import { TenantRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      tenant?: { id: string; role: TenantRole };
    }
  }
}

export {};
