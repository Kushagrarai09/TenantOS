import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./modules/auth/routes";
import { tenantRouter } from "./modules/tenants/routes";
import { projectRouter } from "./modules/projects/routes";
import { usageRouter } from "./modules/usage/routes";
import { billingRouter } from "./modules/billing/routes";
import { auditRouter } from "./modules/audit/routes";
import { userRouter } from "./modules/users/routes";
import { errorHandler } from "./middleware/error";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
app.post("/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/tenants", tenantRouter);
app.use("/users", userRouter);
app.use("/projects", projectRouter);
app.use("/usage", usageRouter);
app.use("/billing", billingRouter);
app.use("/audit-logs", auditRouter);

app.use(errorHandler);
