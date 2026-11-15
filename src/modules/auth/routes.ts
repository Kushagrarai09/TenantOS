import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../config/db";
import { env } from "../../config/env";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

function tokens(userId: string) {
  const accessToken = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] });
  const refreshToken = jwt.sign({ userId, type: "refresh" }, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"] });
  return { accessToken, refreshToken };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, email: true, name: true },
    });
    return res.status(201).json({ user, ...tokens(user.id) });
  } catch (error) { return next(error); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = credentials.omit({ name: true }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens(user.id) });
  } catch (error) { return next(error); }
});

authRouter.post("/refresh", async (req, res) => {
  const token = z.string().min(1).safeParse(req.body?.refreshToken);
  if (!token.success) return res.status(400).json({ error: "refreshToken is required" });
  try {
    const payload = jwt.verify(token.data, env.JWT_REFRESH_SECRET) as { userId: string; type?: string };
    if (payload.type !== "refresh") return res.status(401).json({ error: "Invalid refresh token" });
    return res.json(tokens(payload.userId));
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});
