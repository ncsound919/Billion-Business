/**
 * Billing Routes - Phase 2
 * Stripe integration, subscription management, invoices
 */

import express from "express";
import Stripe from "stripe";
import { authMiddleware, orgAccessMiddleware } from "../middleware/auth.ts";
const { Router } = express;
type Request = express.Request;
type Response = express.Response;
import { query } from "../db/pool";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

const router = Router();

const PRICING_TIERS = {
  free: { name: "Free", monthlyPrice: 0, scansPerMonth: 3 },
  starter: { name: "Starter", monthlyPrice: 9, scansPerMonth: 30 },
  professional: { name: "Professional", monthlyPrice: 29, scansPerMonth: 150 },
  enterprise: { name: "Enterprise", monthlyPrice: 299, scansPerMonth: Infinity },
};

router.get("/plans", (_req: Request, res: Response) => {
  res.json(PRICING_TIERS);
});

router.post("/checkout", authMiddleware, async (req: Request, res: Response) => {
  const { planTier, orgId } = req.body;
  
  try {
    const orgRes = await query("SELECT stripe_customer_id FROM orgs WHERE id = $1", [orgId]);
    let customerId = orgRes.rows[0]?.stripe_customer_id;

    if (!customerId) {
        const customer = await stripe.customers.create({
            metadata: { orgId }
        });
        customerId = customer.id;
        await query("UPDATE orgs SET stripe_customer_id = $1 WHERE id = $2", [customerId, orgId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price: planTier, // Assuming tier ID is passed
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/portal", authMiddleware, async (req: Request, res: Response) => {
  const { orgId } = req.query;
  try {
    const orgRes = await query("SELECT stripe_customer_id FROM orgs WHERE id = $1", [orgId]);
    const customerId = orgRes.rows[0]?.stripe_customer_id;

    if (!customerId) return res.status(404).json({ error: "No customer found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "invoice.paid":
      const invoice = event.data.object as Stripe.Invoice;
      await query("UPDATE invoices SET status = 'paid' WHERE stripe_invoice_id = $1", [invoice.id]);
      break;
    case "customer.subscription.updated":
      const sub = event.data.object as Stripe.Subscription;
      await query("UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2", [sub.status, sub.id]);
      break;
  }

  res.json({ received: true });
});

export default router;
