import db from "../db.server";
import { planFromSubscriptionName, type PlanKey } from "./plans";

interface GraphqlClient {
  graphql: (query: string) => Promise<Response>;
}

interface Subscription {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd: string;
  trialDays: number;
}

interface PlanQuery {
  data: {
    shop: { plan: { partnerDevelopment: boolean } };
    currentAppInstallation: { activeSubscriptions: Subscription[] };
  };
}

/**
 * Work out the shop's plan from Shopify and store it on Settings.
 * Development stores get every feature for free (they can't be charged anyway).
 */
export async function syncPlan(admin: GraphqlClient, shop: string) {
  const response = await admin.graphql(`#graphql
    query PlanStatus {
      shop { plan { partnerDevelopment } }
      currentAppInstallation {
        activeSubscriptions { id name status currentPeriodEnd trialDays }
      }
    }
  `);
  const { data } = (await response.json()) as PlanQuery;

  const subs = data.currentAppInstallation.activeSubscriptions
    .map((sub) => ({ sub, plan: planFromSubscriptionName(sub.name) }))
    .filter((entry): entry is { sub: Subscription; plan: "instagram" | "pro" } => entry.plan !== null);
  // Normally only one is active (a new plan replaces the old); prefer Pro if both are.
  const current = subs.find((s) => s.plan === "pro") ?? subs[0] ?? null;

  const isDevStore = data.shop.plan.partnerDevelopment === true;
  const plan: PlanKey = isDevStore ? "pro" : current?.plan ?? "free";
  const activeSub = current?.sub ?? null;

  await db.settings.update({
    where: { shop },
    data: { plan, subscriptionId: activeSub?.id ?? null },
  });

  return { plan, isDevStore, activeSub, paidPlan: current?.plan ?? null };
}
