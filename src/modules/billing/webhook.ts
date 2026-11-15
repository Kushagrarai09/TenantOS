import type { Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../../config/env";
import { prisma } from "../../config/db";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export async function stripeWebhook(req: Request, res: Response) {
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
        const statuses: Record<string, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE"> = {
          active: "ACTIVE",
          trialing: "TRIALING",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          incomplete: "INCOMPLETE",
          unpaid: "PAST_DUE",
        };
        await prisma.subscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            stripeCustomerId: String(subscription.customer),
            stripeSubscriptionId: subscription.id,
            status: statuses[subscription.status] ?? "INCOMPLETE",
            priceId: subscription.items.data[0]?.price.id,
          },
          update: {
            stripeCustomerId: String(subscription.customer),
            stripeSubscriptionId: subscription.id,
            status: statuses[subscription.status] ?? "INCOMPLETE",
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
}
