// Plans (shared by server and UI):
// - free:      live store without a subscription → app inactive (dev stores are stored as "pro")
// - basic:     $4.99/month → Instagram feed only
// - pro:       $6.99/month → terms & conditions checkbox + Instagram feed (full access)
export type PlanKey = "free" | "basic" | "pro";

export const PAID_PLANS = {
  basic: { name: "basic plan", amount: 4.99 },
  pro: { name: "pro plan", amount: 6.99 },
} as const;

export type PaidPlanKey = keyof typeof PAID_PLANS;

export const hasTermsFeature = (plan: string | null | undefined) => plan === "pro";
export const hasInstagramFeature = (plan: string | null | undefined) => plan === "pro" || plan === "basic";

/** Map a Shopify subscription name back to our plan key. */
export function planFromSubscriptionName(name: string): PaidPlanKey | null {
  const entry = (Object.keys(PAID_PLANS) as PaidPlanKey[]).find((key) => PAID_PLANS[key].name === name);
  return entry ?? null;
}
