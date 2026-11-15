import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { allowRoles } from "../../middleware/rbac";
import { TenantRole } from "@prisma/client";

export const billingRouter = Router();
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

billingRouter.get("/subscription", authenticate, resolveTenant, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { tenantId: req.tenant!.id } });
    return res.json(subscription);
  } catch (error) { return next(error); }
});

billingRouter.post("/checkout-session", authenticate, resolveTenant, allowRoles(TenantRole.OWNER, TenantRole.ADMIN), async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY." });
    const input = z.object({ priceId: z.string().min(3) }).parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.id },
      include: { subscription: true },
    });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    let customerId = tenant.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: tenant.name, metadata: { tenantId: tenant.id } });
      customerId = customer.id;
      await prisma.subscription.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL ?? "http://localhost:3000"}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL ?? "http://localhost:3000"}/billing/cancel`,
      subscription_data: { metadata: { tenantId: tenant.id } },
    });
    return res.json({ checkoutUrl: session.url });
  } catch (error) { return next(error); }
});

billingRouter.post("/webhook", async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe webhook is not configured" });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"] as string,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).json({ error: "Invalid Stripe webhook signature" });
  }

  try {
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const tenantId = subscription.metadata.tenantId;
      if (tenantId) {
        const statusMap: Record<string, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE"> = {
          active: "ACTIVE", trialing: "TRIALING", past_due: "PAST_DUE",
          canceled: "CANCELED", incomplete: "INCOMPLETE", unpaid: "PAST_DUE",
        };
        await prisma.subscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            stripeCustomerId: String(subscription.customer),
            stripeSubscriptionId: subscription.id,
            status: statusMap[subscription.status] ?? "INCOMPLETE",
            priceId: subscription.items.data[0]?.price.id,
          },
          update: {
            stripeCustomerId: String(subscription.customer),
            stripeSubscriptionId: subscription.id,
            status: statusMap[subscription.status] ?? "INCOMPLETE",
            priceId: subscription.items.data[0]?.price.id,
          },
        });
      }
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});
