import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { Toast } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateSettings } from "../utils/settings.server";
import type { LinkItem, SettingsState } from "../utils/settings-types";
import { getTranslations, useT } from "../utils/i18n";
import SettingsGeneral from "../components/SettingsGeneral";
import SettingsDesign from "../components/SettingsDesign";
import SettingsDeveloper from "../components/SettingsDeveloper";
import LivePreview from "../components/LivePreview";

const EN_DEFAULTS = {
  agreementText: "I have read and agreed with the {link} and {link-2}",
  errorMessage: "You must accept the terms and conditions to continue.",
  helperText: "Required to complete checkout.",
};

const ALL_KNOWN_DEFAULTS = {
  agreementText: [
    EN_DEFAULTS.agreementText,
    "He leído y acepto los {link} y la {link-2}",
    "Ho letto e accettato i {link} e la {link-2}",
    "Ich habe die {link} und die {link-2} gelesen und stimme zu",
    "J'ai lu et accepté les {link} et la {link-2}",
  ],
  errorMessage: [
    EN_DEFAULTS.errorMessage,
    "Debes aceptar los términos y condiciones para continuar.",
    "Devi accettare i termini e le condizioni per continuare.",
    "Sie müssen die Allgemeinen Geschäftsbedingungen akzeptieren.",
    "Vous devez accepter les conditions générales pour continuer.",
  ],
  helperText: [
    EN_DEFAULTS.helperText,
    "Requerido para completar el pago.",
    "Obbligatorio per completare il checkout.",
    "Erforderlich, um den Checkout abzuschließen.",
    "Requis pour finaliser le paiement.",
  ],
};

function normalizeToEnDefault<K extends keyof typeof ALL_KNOWN_DEFAULTS>(field: K, value: string): string {
  return ALL_KNOWN_DEFAULTS[field].includes(value) ? EN_DEFAULTS[field] : value;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getOrCreateSettings(session.shop);
  const language = (settings as unknown as { language?: string }).language ?? "auto";
  const t = getTranslations(language);

  const displaySettings = {
    ...settings,
    agreementText: ALL_KNOWN_DEFAULTS.agreementText.includes(settings.agreementText) ? t.formDefaults.agreementText : settings.agreementText,
    errorMessage: ALL_KNOWN_DEFAULTS.errorMessage.includes(settings.errorMessage) ? t.formDefaults.errorMessage : settings.errorMessage,
    helperText: ALL_KNOWN_DEFAULTS.helperText.includes(settings.helperText) ? t.formDefaults.helperText : settings.helperText,
  };

  return { settings: displaySettings, plan: settings.plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json()) as SettingsState;

  const current = await db.settings.findUnique({ where: { shop: session.shop } });
  const isPro = current?.plan === "pro";

  const agreementText = normalizeToEnDefault("agreementText", body.agreementText);
  const helperText = normalizeToEnDefault("helperText", body.helperText);
  const errorMessage = normalizeToEnDefault("errorMessage", body.errorMessage);

  await db.settings.update({
    where: { shop: session.shop },
    data: {
      agreementText, links: body.links as unknown as object, requireAcceptance: body.requireAcceptance,
      helperText, errorMessage: isPro ? errorMessage : current?.errorMessage, errorDisplayType: body.errorDisplayType,
      locationCart: body.locationCart, locationProduct: body.locationProduct, locationCollection: body.locationCollection,
      locationAllCheckout: body.locationAllCheckout, locationCustom: body.locationCustom,
      textColor: body.textColor, fontSize: body.fontSize, fontFamily: body.fontFamily, alignment: body.alignment,
      helperTextColor: body.helperTextColor, helperFontSize: body.helperFontSize,
      spacingTop: body.spacingTop, spacingRight: body.spacingRight, spacingBottom: body.spacingBottom, spacingLeft: body.spacingLeft,
      checksByDefault: body.checksByDefault, checkboxStyle: body.checkboxStyle,
      uncheckedColor: body.uncheckedColor, checkedColor: body.checkedColor,
      linkColor: body.linkColor, showLinkUnderline: body.showLinkUnderline, openLinksNewTab: body.openLinksNewTab,
      popupTitleColor: body.popupTitleColor, popupMessageColor: body.popupMessageColor,
      popupBtnTextColor: body.popupBtnTextColor, popupBtnBgColor: body.popupBtnBgColor,
      popupBgColor: body.popupBgColor, popupIconColor: body.popupIconColor,
      customCss: body.customCss || null, customScript: body.customScript || null,
      language: body.language || "auto", settingsCustomized: true,
    },
  });

  return { ok: true };
};

export default function Settings() {
  const { settings: initialSettings, plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const t = useT();

  const [selectedTab, setSelectedTab] = useState(0);
  const [settings, setSettings] = useState<SettingsState>({
    ...initialSettings,
    links: initialSettings.links as unknown as LinkItem[],
    customCss: initialSettings.customCss || "",
    customScript: initialSettings.customScript || "",
    language: (initialSettings as unknown as { language: string }).language || "auto",
  } as SettingsState);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) setShowToast(true);
  }, [fetcher.state, fetcher.data]);

  const handleChange = (patch: Partial<SettingsState>) => setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    fetcher.submit(JSON.parse(JSON.stringify(settings)), { method: "POST", encType: "application/json" });
  };

  const tabLabels = [t.settings.tabGeneral, t.settings.tabDesign, t.settings.tabDeveloper];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <a href="/app" style={{ color: "#9CA3AF", textDecoration: "none", display: "flex", alignItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </a>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.settings.title}</div>
          </div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>{t.settings.subtitle}</div>
        </div>
        <button
          onClick={handleSave}
          disabled={fetcher.state !== "idle"}
          style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: fetcher.state !== "idle" ? 0.7 : 1 }}
        >
          {fetcher.state !== "idle" ? "Saving…" : t.common.save}
        </button>
      </div>

      {/* Live Preview */}
      <div style={{ marginBottom: 20 }}>
        <LivePreview settings={settings} />
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6", padding: "0 24px" }}>
          {tabLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => setSelectedTab(i)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "14px 20px",
                fontSize: 14, fontWeight: 600, color: selectedTab === i ? "#3B82F6" : "#6B7280",
                borderBottom: selectedTab === i ? "2px solid #3B82F6" : "2px solid transparent",
                marginBottom: -1, transition: "color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {selectedTab === 0 && <SettingsGeneral settings={settings} onChange={handleChange} plan={plan} />}
          {selectedTab === 1 && <SettingsDesign settings={settings} onChange={handleChange} />}
          {selectedTab === 2 && <SettingsDeveloper settings={settings} onChange={handleChange} />}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid #F3F4F6" }}>
            <button
              onClick={handleSave}
              disabled={fetcher.state !== "idle"}
              style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: fetcher.state !== "idle" ? 0.7 : 1 }}
            >
              {fetcher.state !== "idle" ? "Saving…" : t.common.save}
            </button>
          </div>
        </div>
      </div>

      {showToast && <Toast content={t.common.saved} onDismiss={() => setShowToast(false)} />}
    </div>
  );
}
