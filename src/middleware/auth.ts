import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = { id: payload.userId };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}
