import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateSettings } from "../utils/settings.server";
import { isAppEmbedEnabled } from "../utils/theme-embed.server";
import { useT } from "../utils/i18n";
import SetupGuide from "../components/SetupGuide";
import AnalyticsOverview from "../components/AnalyticsOverview";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await getOrCreateSettings(shop);

  if (!settings.embedEnabled) {
    const enabled = await isAppEmbedEnabled(
      shop,
      session.accessToken!,
      process.env.APP_EMBED_UUID || "",
    ).catch(() => false);
    if (enabled) {
      settings = await db.settings.update({ where: { shop }, data: { embedEnabled: true } });
    }
  }

  const [totalChecks, cartChecks, productChecks] = await Promise.all([
    db.analyticsEvent.count({ where: { shop, checked: true } }),
    db.analyticsEvent.count({ where: { shop, checked: true, location: "cart" } }),
    db.analyticsEvent.count({ where: { shop, checked: true, location: "product" } }),
  ]);

  return {
    shop,
    settings,
    stats: { totalChecks, cartChecks, productChecks },
    appEmbedUuid: process.env.APP_EMBED_UUID || "",
    plan: settings.plan,
    overLimit: settings.plan === "free" && settings.monthlyOrderCount >= 10,
    monthlyOrderCount: settings.monthlyOrderCount,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "dismissSetupGuide") {
    await db.settings.update({ where: { shop: session.shop }, data: { setupGuideDismissed: true } });
  } else if (intent === "dismissNeedHelp") {
    await db.settings.update({ where: { shop: session.shop }, data: { needHelpDismissed: true } });
  } else if (intent === "markPreviewComplete") {
    await db.settings.update({ where: { shop: session.shop }, data: { previewCompleted: true } });
  }

  return { ok: true };
};

function FaqAccordion() {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {t.dashboard.faq.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q} style={{ borderBottom: "1px solid #F3F4F6" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{item.q}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isOpen && (
              <div style={{ fontSize: 13, color: "#6B7280", paddingBottom: 14, paddingLeft: 0, lineHeight: 1.6 }}>
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Index() {
  const { shop, settings, stats, appEmbedUuid, overLimit, monthlyOrderCount } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const t = useT();

  const handlePreview = () => {
    fetcher.submit({ intent: "markPreviewComplete" }, { method: "POST" });
    window.open(`https://${shop}/cart`, "_blank");
  };

  const dismissSetupGuide = () => fetcher.submit({ intent: "dismissSetupGuide" }, { method: "POST" });
  const dismissNeedHelp = () => fetcher.submit({ intent: "dismissNeedHelp" }, { method: "POST" });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg,#3B82F6,#6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.15 }}>
            {t.dashboard.title}
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginTop: 1 }}>Terms &amp; Conditions Manager</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SetupGuide
          shop={shop}
          appEmbedUuid={appEmbedUuid}
          step1Done={settings.embedEnabled}
          step2Done={settings.settingsCustomized}
          step3Done={settings.previewCompleted}
          dismissed={settings.setupGuideDismissed}
          onDismiss={dismissSetupGuide}
          onPreview={handlePreview}
        />

        {overLimit && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>{t.dashboard.overLimitTitle} ({monthlyOrderCount}/10)</div>
              <div style={{ fontSize: 13, color: "#B45309", marginTop: 2 }}>{t.dashboard.overLimitDesc}</div>
            </div>
            <a href="/app/billing" style={{ background: "#F59E0B", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", marginLeft: 16 }}>
              {t.common.upgrade}
            </a>
          </div>
        )}

        <AnalyticsOverview
          totalChecks={stats.totalChecks}
          cartChecks={stats.cartChecks}
          productChecks={stats.productChecks}
        />

        {/* FAQ */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{t.dashboard.faqTitle}</div>
            <a href="/app/support" style={{ fontSize: 13, color: "#3B82F6", textDecoration: "none", fontWeight: 500 }}>{t.dashboard.visitSupport}</a>
          </div>
          <FaqAccordion />
        </div>

        {/* Need Help */}
        {!settings.needHelpDismissed && (
          <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>{t.dashboard.needHelp}</div>
              <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 2 }}>{t.dashboard.needHelpDesc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href="/app/support" style={{ background: "#3B82F6", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                {t.common.contactSupport}
              </a>
              <button onClick={dismissNeedHelp} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
