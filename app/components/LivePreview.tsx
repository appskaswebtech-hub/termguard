import { useEffect, useMemo, useState } from "react";
import { BlockStack, Box, Card, InlineStack, Modal, Tabs, Text } from "@shopify/polaris";
import type { SettingsState } from "../utils/settings-types";
import { useT } from "../utils/i18n";

interface LivePreviewProps {
  settings: SettingsState;
}

function renderAgreementText(
  text: string,
  links: SettingsState["links"],
  linkColor: string,
  underline: boolean,
  newTab: boolean,
) {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\{([^}]+)\}$/);
    if (match) {
      const link = links.find((l) => l.id === match[1]);
      if (link) {
        return (
          <a
            key={index}
            href={link.url}
            style={{ color: linkColor, textDecoration: underline ? "underline" : "none" }}
            target={newTab ? "_blank" : undefined}
            rel={newTab ? "noopener noreferrer" : undefined}
            onClick={(e) => e.preventDefault()}
          >
            {link.label}
          </a>
        );
      }
    }
    return <span key={index}>{part}</span>;
  });
}

function CheckboxVisual({
  style, checked, uncheckedColor, checkedColor,
}: {
  style: SettingsState["checkboxStyle"]; checked: boolean; uncheckedColor: string; checkedColor: string;
}) {
  if (style === "none") return null;

  if (style === "toggle") {
    return (
      <div style={{ width: 32, height: 18, borderRadius: 9, backgroundColor: checked ? checkedColor : uncheckedColor, position: "relative", flexShrink: 0, transition: "background-color 150ms" }}>
        <div style={{ position: "absolute", top: 2, left: checked ? 16 : 2, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", transition: "left 150ms" }} />
      </div>
    );
  }

  const borderRadius = style === "rounded" ? 6 : style === "outlined" ? 2 : 3;
  const filled = style === "default";
  const bgColor = checked ? checkedColor : "transparent";

  return (
    <div style={{ width: 18, height: 18, borderRadius, border: `2px solid ${checked ? checkedColor : uncheckedColor}`, backgroundColor: filled && checked ? checkedColor : bgColor, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ position: "absolute" }}>
          <polyline points="2,6 5,9 10,3" stroke={filled ? "#fff" : checkedColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export default function LivePreview({ settings }: LivePreviewProps) {
  const t = useT();

  const LOCATION_TABS = [
    { id: "cart", label: t.preview.cartPage, enabledKey: "locationCart" as keyof SettingsState, pageLabel: t.preview.cart },
    { id: "product", label: t.preview.productPage, enabledKey: "locationProduct" as keyof SettingsState, pageLabel: t.preview.product },
    { id: "collection", label: t.preview.collectionPage, enabledKey: "locationCollection" as keyof SettingsState, pageLabel: t.preview.collection },
    { id: "checkout", label: t.preview.allCheckout, enabledKey: "locationAllCheckout" as keyof SettingsState, pageLabel: t.preview.checkout2 },
    { id: "custom", label: t.preview.customPlacement, enabledKey: "locationCustom" as keyof SettingsState, pageLabel: t.preview.custom },
  ];

  const availableTabs = useMemo(() => {
    const enabled = LOCATION_TABS.filter((tab) => settings[tab.enabledKey]);
    return enabled.length > 0 ? enabled : [LOCATION_TABS[0]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, t]);

  const [selectedTab, setSelectedTab] = useState(0);
  const [checked, setChecked] = useState(settings.checksByDefault);
  const [showInlineError, setShowInlineError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => { setChecked(settings.checksByDefault); }, [settings.checksByDefault]);
  useEffect(() => { if (selectedTab >= availableTabs.length) setSelectedTab(0); }, [availableTabs, selectedTab]);

  const activeTab = availableTabs[selectedTab] || availableTabs[0];

  const handleCheckout = () => {
    if (settings.requireAcceptance && !checked) {
      if (settings.errorDisplayType === "popup") setShowPopup(true);
      else setShowInlineError(true);
      return;
    }
    setShowInlineError(false);
  };

  const handleToggleChecked = () => {
    setChecked((prev) => !prev);
    setShowInlineError(false);
  };

  const alignToFlex: Record<SettingsState["alignment"], "flex-start" | "center" | "flex-end"> = {
    Left: "flex-start", Center: "center", Right: "flex-end",
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Tabs
          tabs={availableTabs.map((tab) => ({ id: tab.id, content: tab.label }))}
          selected={selectedTab}
          onSelect={setSelectedTab}
        />

        <Box background="bg-surface-secondary" borderRadius="200" padding="400">
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              {t.preview.yourStore} · {activeTab.pageLabel}
            </Text>

            <Box background="bg-surface" borderRadius="200" padding="300">
              <InlineStack gap="300" blockAlign="center">
                <Box minWidth="48px" minHeight="48px" borderRadius="100" background="bg-surface-tertiary" />
                <BlockStack gap="050">
                  <Text as="span" fontWeight="semibold">{t.preview.sampleProduct}</Text>
                  <Text as="span" tone="subdued">{t.preview.qty} 1 · $24.00</Text>
                </BlockStack>
              </InlineStack>
            </Box>

            <InlineStack align="space-between">
              <Text as="span" fontWeight="semibold">{t.preview.subtotal}</Text>
              <Text as="span" fontWeight="semibold">$24.00</Text>
            </InlineStack>

            <div
              style={{
                paddingTop: settings.spacingTop, paddingRight: settings.spacingRight,
                paddingBottom: settings.spacingBottom, paddingLeft: settings.spacingLeft,
                display: "flex", flexDirection: "column", gap: 4,
                alignItems: alignToFlex[settings.alignment],
                textAlign: settings.alignment.toLowerCase() as "left" | "center" | "right",
              }}
            >
              <div
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontFamily: settings.fontFamily === "Inherit" ? "inherit" : settings.fontFamily }}
                onClick={handleToggleChecked}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggleChecked(); } }}
              >
                <CheckboxVisual style={settings.checkboxStyle} checked={checked} uncheckedColor={settings.uncheckedColor} checkedColor={settings.checkedColor} />
                <span style={{ color: settings.textColor, fontSize: settings.fontSize }}>
                  {renderAgreementText(settings.agreementText, settings.links, settings.linkColor, settings.showLinkUnderline, settings.openLinksNewTab)}
                </span>
              </div>
              <span style={{ color: settings.helperTextColor, fontSize: settings.helperFontSize }}>
                {settings.helperText}
              </span>
              {showInlineError && (
                <span style={{ color: "#D72C0D", fontSize: settings.helperFontSize }}>
                  {settings.errorMessage}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              style={{ backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "12px 0", fontWeight: 600, cursor: "pointer" }}
            >
              {t.preview.checkout}
            </button>

            <Text as="p" tone="subdued">{t.preview.hint}</Text>
          </BlockStack>
        </Box>
      </BlockStack>

      {showPopup && (
        <Modal open onClose={() => setShowPopup(false)} title="" titleHidden noScroll>
          <Modal.Section>
            <BlockStack gap="300" inlineAlign="center">
              <Box minWidth="40px" minHeight="40px" borderRadius="full" background="bg-surface">
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: settings.popupIconColor }} />
              </Box>
              <Text as="h2" variant="headingMd" alignment="center">
                <span style={{ color: settings.popupTitleColor }}>{t.preview.termsNotAccepted}</span>
              </Text>
              <Text as="p" alignment="center">
                <span style={{ color: settings.popupMessageColor }}>{settings.errorMessage}</span>
              </Text>
              <div style={{ backgroundColor: settings.popupBgColor, width: "100%", display: "flex", justifyContent: "center", paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  style={{ backgroundColor: settings.popupBtnBgColor, color: settings.popupBtnTextColor, border: "none", borderRadius: 6, padding: "10px 24px", cursor: "pointer" }}
                >
                  {t.preview.okay}
                </button>
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Card>
  );
}
