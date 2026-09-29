import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useT } from "../utils/i18n";
import { syncPlan } from "../utils/plan.server";
import { PAID_PLANS, type PaidPlanKey } from "../utils/plans";

// Plans: Free = development stores only (every feature, no charge).
// Live stores pick Basic ($4.99, Instagram feed) or Pro ($6.99, everything).
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const { isDevStore, activeSub, paidPlan } = await syncPlan(admin, session.shop);

  return {
    isDevStore,
    paidPlan,
    shop: session.shop,
    subscriptionEndDate: activeSub?.currentPeriodEnd ?? null,
    trialDays: activeSub?.trialDays ?? 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "subscribe") {
    const planKey: PaidPlanKey = formData.get("plan") === "basic" ? "basic" : "pro";
    const chosen = PAID_PLANS[planKey];
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
          // A new subscription replaces the current one, so this also handles upgrade/downgrade.
          name: chosen.name,
          returnUrl,
          trialDays: 7,
          test: false,
          lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: chosen.amount, currencyCode: "USD" }, interval: "EVERY_30_DAYS" } } }],
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

function FeatureItem({ label, included }: { label: string; included: boolean }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: included ? "#374151" : "#9CA3AF" }}>
      {included ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      )}
      {label}
    </li>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "grey" }) {
  const colors = { green: ["#ECFDF5", "#059669"], blue: ["#EFF6FF", "#2563EB"], grey: ["#F3F4F6", "#6B7280"] }[tone];
  return (
    <div style={{ position: "absolute", top: 16, right: 16, background: colors[0], color: colors[1], fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 10px" }}>
      {children}
    </div>
  );
}

export default function Billing() {
  const { isDevStore, paidPlan, shop, subscriptionEndDate, trialDays } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ confirmationUrl?: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const t = useT();
  const isLoading = navigation.state !== "idle";
  const pendingPlan = navigation.formData?.get("plan");

  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.open(actionData.confirmationUrl, "_top");
    }
  }, [actionData]);

  const allFeatures = [
    t.billing.feat.unlimited,
    t.billing.feat.design,
    t.billing.feat.analytics,
    t.billing.feat.customMsg,
    t.billing.feat.instagram,
    t.billing.feat.layouts,
    t.billing.feat.media,
    t.billing.feat.priority,
  ];

  const card = (active: boolean): React.CSSProperties => ({
    flex: "1 1 260px", background: "#fff", borderRadius: 14, padding: 26, boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    border: active ? "2px solid #3B82F6" : "2px solid #F3F4F6", position: "relative", display: "flex", flexDirection: "column",
  });

  const priceBlock = (price: string, desc: string) => (
    <>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
        {price}<span style={{ fontSize: 14, fontWeight: 400, color: "#9CA3AF" }}>{t.billing.month}</span>
      </div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, minHeight: 36 }}>{desc}</div>
      <div style={{ height: 1, background: "#F3F4F6", marginBottom: 16 }} />
    </>
  );

  // Footer of a paid plan card: manage it when current, otherwise start/switch.
  const paidFooter = (plan: PaidPlanKey) => {
    if (isDevStore) return <div style={{ fontSize: 13, color: "#9CA3AF" }}>{t.billing.proDevNote}</div>;
    if (paidPlan === plan) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subscriptionEndDate && (
            <div style={{ fontSize: 13, color: "#6B7280" }}>{t.billing.nextBilling} {new Date(subscriptionEndDate).toLocaleDateString()}</div>
          )}
          {trialDays > 0 && <div style={{ fontSize: 13, color: "#6B7280" }}>{t.billing.trialDays} {trialDays}</div>}
          <button
            onClick={() => submit({ intent: "cancel" }, { method: "post" })}
            disabled={isLoading}
            style={{ background: "none", border: "1px solid #FCA5A5", color: "#EF4444", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {isLoading && !pendingPlan ? "…" : t.billing.cancelSub}
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => submit({ intent: "subscribe", plan, shop }, { method: "post" })}
        disabled={isLoading}
        style={{ width: "100%", background: plan === "pro" ? "#3B82F6" : "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading && pendingPlan === plan ? "Loading…" : paidPlan ? t.billing.switchPlan : t.billing.startTrial}
      </button>
    );
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1040, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <a href="/app" style={{ color: "#9CA3AF", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.billing.title}</div>
      </div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Manage your subscription and plan features</div>

      {/* Live store without a subscription: the app is inactive until they pick a plan */}
      {!isDevStore && !paidPlan && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "14px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>{t.billing.subscribeTitle}</div>
          <div style={{ fontSize: 13, color: "#B45309", marginTop: 2 }}>{t.billing.subscribePlansDesc}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Free — development stores only */}
        <div style={card(isDevStore)}>
          {isDevStore ? <Badge tone="green">{t.billing.current}</Badge> : <Badge tone="grey">{t.billing.devOnly}</Badge>}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.free}</div>
          {priceBlock("$0", t.billing.devOnlyDesc)}
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {allFeatures.map((label) => <FeatureItem key={label} label={label} included />)}
          </ul>
          {!isDevStore && <div style={{ fontSize: 13, color: "#9CA3AF" }}>{t.billing.freeLiveNote}</div>}
        </div>

        {/* Basic: Instagram feed only */}
        <div style={card(paidPlan === "basic")}>
          {paidPlan === "basic" ? <Badge tone="green">{t.billing.current}</Badge> : !isDevStore && <Badge tone="blue">{t.billing.trial}</Badge>}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.basicPlan}</div>
          {priceBlock("$4.99", "")}
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <FeatureItem label={t.billing.feat.instagram} included />
            <FeatureItem label={t.billing.feat.layouts} included />
            <FeatureItem label={t.billing.feat.media} included />
            <FeatureItem label={t.billing.feat.priority} included />
            <FeatureItem label={t.billing.termsRow} included={false} />
            <FeatureItem label={t.billing.feat.analytics} included={false} />
          </ul>
          {paidFooter("basic")}
        </div>

        {/* Pro — everything */}
        <div style={card(paidPlan === "pro")}>
          {paidPlan === "pro" ? <Badge tone="green">{t.billing.current}</Badge> : !isDevStore && <Badge tone="blue">{t.billing.trial}</Badge>}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.billing.pro}</div>
          {priceBlock("$6.99", t.billing.proDesc)}
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {allFeatures.map((label) => <FeatureItem key={label} label={label} included />)}
          </ul>
          {paidFooter("pro")}
        </div>
      </div>
    </div>
  );
}
