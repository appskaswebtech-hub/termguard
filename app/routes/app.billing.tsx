import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useT } from "../utils/i18n";

const PRO_PLAN_NAME = "pro plan";
const FREE_LIMIT = 10;

async function getActiveSubscription(admin: { graphql: (query: string) => Promise<Response> }) {
  const res = await admin.graphql(`
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          trialDays
        }
      }
    }
  `);
  const data = (await res.json()) as {
    data: { currentAppInstallation: { activeSubscriptions: { id: string; name: string; status: string; currentPeriodEnd: string; trialDays: number }[] } };
  };
  const subs = data.data.currentAppInstallation.activeSubscriptions;
  console.log("[billing] activeSubscriptions:", JSON.stringify(subs));
  return subs.find((s) => s.name === PRO_PLAN_NAME) ?? null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const activeSub = await getActiveSubscription(admin);
  const plan = activeSub ? "pro" : "free";

  await db.settings.update({
    where: { shop: session.shop },
    data: { plan, subscriptionId: activeSub?.id ?? null },
  });

  const settings = await db.settings.findUnique({ where: { shop: session.shop } });

  return {
    plan,
    shop: session.shop,
    monthlyOrderCount: settings?.monthlyOrderCount ?? 0,
    subscriptionEndDate: activeSub?.currentPeriodEnd ?? null,
    trialDays: activeSub?.trialDays ?? 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "subscribe") {
    const returnUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;
    const response = await admin.graphql(
      `mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, trialDays: $trialDays, test: $test) {
          userErrors { field message }
          confirmationUrl
          appSubscription { id status }
        }
      }`,
      {
        variables: {
          name: "pro plan",
          returnUrl,
          trialDays: 7,
          test: false,
          lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: 6.99, currencyCode: "USD" }, interval: "EVERY_30_DAYS" } } }],
        },
      },
    );
    const result = (await response.json()) as { data: { appSubscriptionCreate: { confirmationUrl: string; userErrors: { message: string }[] } } };
    const { confirmationUrl, userErrors } = result.data.appSubscriptionCreate;
    console.log("[billing] subscribe:", { confirmationUrl, userErrors });
    if (userErrors?.length) throw new Error(userErrors[0].message);
    return { confirmationUrl };
  }

  if (intent === "cancel") {
    const settings = await db.settings.findUnique({ where: { shop: session.shop } });
    if (settings?.subscriptionId) {
      await admin.graphql(
        `mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            userErrors { field message }
            appSubscription { id status }
          }
        }`,
        { variables: { id: settings.subscriptionId } },
      );
    }
    await db.settings.update({ where: { shop: session.shop }, data: { plan: "free", subscriptionId: null } });
    return redirect("/app/billing");
  }

  return null;
};

export default function Billing() {
  const { plan, shop, monthlyOrderCount, subscriptionEndDate, trialDays } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ confirmationUrl?: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const t = useT();
  const isLoading = navigation.state !== "idle";
  const isPro = plan === "pro";
  const usagePercent = Math.min((monthlyOrderCount / FREE_LIMIT) * 100, 100);
  const overLimit = !isPro && monthlyOrderCount >= FREE_LIMIT;

  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.open(actionData.confirmationUrl, "_top");
    }
  }, [actionData]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <a href="/app" style={{ color: "#9CA3AF", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.billing.title}</div>
      </div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Manage your subscription and plan features</div>

      {/* Over limit banner */}
      {overLimit && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>{t.billing.overLimitTitle}</div>
            <div style={{ fontSize: 13, color: "#B45309", marginTop: 2 }}>{t.billing.overLimitDesc}</div>
          </div>
          <button
            onClick={() => submit({ intent: "subscribe", shop }, { method: "post" })}
            style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 16 }}
          >
            {t.billing.upgradeCta}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Free Plan */}
        <div style={{ flex: "1 1 280px", background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: !isPro ? "2px solid #3B82F6" : "2px solid #F3F4F6", position: "relative" }}>
          {!isPro && (
            <div style={{ position: "absolute", top: 16, right: 16, background: "#ECFDF5", color: "#059669", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 10px" }}>
              {t.billing.current}
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.free}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 16 }}>
            $0<span style={{ fontSize: 14, fontWeight: 400, color: "#9CA3AF" }}>{t.billing.month}</span>
          </div>
          <div style={{ height: 1, background: "#F3F4F6", marginBottom: 16 }} />
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[t.billing.feat.orders10, t.billing.feat.design, t.billing.feat.analytics, t.billing.feat.lockedMsg].map((f, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#374151" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={i < 3 ? "#10B981" : "#D1D5DB"} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                <span>{t.billing.usage}</span>
                <span style={{ color: overLimit ? "#EF4444" : "#6B7280", fontWeight: 600 }}>{monthlyOrderCount} / {FREE_LIMIT}</span>
              </div>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${usagePercent}%`, background: overLimit ? "#EF4444" : "#3B82F6", borderRadius: 99, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>

        {/* Pro Plan */}
        <div style={{ flex: "1 1 280px", background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: isPro ? "2px solid #3B82F6" : "2px solid #F3F4F6", position: "relative" }}>
          {isPro ? (
            <div style={{ position: "absolute", top: 16, right: 16, background: "#ECFDF5", color: "#059669", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 10px" }}>
              {t.billing.current}
            </div>
          ) : (
            <div style={{ position: "absolute", top: 16, right: 16, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 10px" }}>
              {t.billing.trial}
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.pro}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 16 }}>
            $6.99<span style={{ fontSize: 14, fontWeight: 400, color: "#9CA3AF" }}>{t.billing.month}</span>
          </div>
          <div style={{ height: 1, background: "#F3F4F6", marginBottom: 16 }} />
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[t.billing.feat.unlimited, t.billing.feat.design, t.billing.feat.analytics, t.billing.feat.customMsg, t.billing.feat.priority].map((f, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#374151" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {subscriptionEndDate && (
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  {t.billing.nextBilling} {new Date(subscriptionEndDate).toLocaleDateString()}
                </div>
              )}
              {trialDays > 0 && (
                <div style={{ fontSize: 13, color: "#6B7280" }}>{t.billing.trialDays} {trialDays}</div>
              )}
              <button
                onClick={() => submit({ intent: "cancel" }, { method: "post" })}
                disabled={isLoading}
                style={{ background: "none", border: "1px solid #FCA5A5", color: "#EF4444", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {isLoading ? "…" : t.billing.cancelSub}
              </button>
            </div>
          ) : (
            <button
              onClick={() => submit({ intent: "subscribe", shop }, { method: "post" })}
              disabled={isLoading}
              style={{ width: "100%", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? "Loading…" : t.billing.startTrial}
            </button>
          )}
        </div>
      </div>

      {/* Comparison info */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.comparison}</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{t.billing.comparisonDesc}</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginTop: 4 }}>{t.billing.comparisonDesc2}</div>
      </div>
    </div>
  );
}
