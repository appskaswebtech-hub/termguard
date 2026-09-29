import db from "../db.server";

export const PRO_PLAN_NAME = "pro plan";

interface GraphqlClient {
  graphql: (query: string) => Promise<Response>;
}

interface PlanQuery {
  data: {
    shop: { plan: { partnerDevelopment: boolean } };
    currentAppInstallation: {
      activeSubscriptions: { id: string; name: string; status: string; currentPeriodEnd: string; trialDays: number }[];
    };
  };
}

/**
 * Work out the shop's plan from Shopify and store it on Settings.
 * Development stores get every Pro feature for free (they can't be charged anyway).
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

  const activeSub = data.currentAppInstallation.activeSubscriptions.find((s) => s.name === PRO_PLAN_NAME) ?? null;
  const isDevStore = data.shop.plan.partnerDevelopment === true;
  const plan = activeSub || isDevStore ? "pro" : "free";

  await db.settings.update({
    where: { shop },
    data: { plan, subscriptionId: activeSub?.id ?? null },
  });

  return { plan, isDevStore, activeSub };
}
