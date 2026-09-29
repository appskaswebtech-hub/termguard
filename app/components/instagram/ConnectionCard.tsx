import { Badge, Banner, BlockStack, Button, Card, InlineStack, Text } from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import { fmt, useInstagramT } from "../../utils/instagram-i18n";

export interface ConnectedAccount {
  username: string;
  accountType: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

interface ConnectionCardProps {
  configured: boolean;
  account: ConnectedAccount | null;
  busy: "connect" | "sync" | "disconnect" | null;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}

const InstagramGlyph = () => (
  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(214,36,159,0.3)" }}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="#fff" />
    </svg>
  </div>
);

function relativeTime(iso: string, lang: string) {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, "minute");
}

export default function ConnectionCard({ configured, account, busy, onConnect, onSync, onDisconnect }: ConnectionCardProps) {
  const t = useInstagramT();
  const needsReconnect = account?.lastSyncError === "reconnect";

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack gap="300" blockAlign="center" wrap={false}>
          <InstagramGlyph />
          <BlockStack gap="050">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">{t.connectionTitle}</Text>
              {account ? (
                <Badge tone={needsReconnect ? "warning" : "success"}>{t.connected}</Badge>
              ) : (
                <Badge>{t.notConnected}</Badge>
              )}
            </InlineStack>
            {account ? (
              <Text as="p" variant="bodySm" tone="subdued">
                <a href={`https://www.instagram.com/${account.username}/`} target="_blank" rel="noreferrer" style={{ color: "#111827", fontWeight: 600, textDecoration: "none" }}>
                  @{account.username}
                </a>
                {account.accountType ? ` · ${account.accountType.replace(/_/g, " ").toLowerCase()}` : ""}
                {" · "}
                {account.lastSyncedAt ? fmt(t.lastSynced, { time: relativeTime(account.lastSyncedAt, t.lang) }) : t.neverSynced}
              </Text>
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">{configured ? t.connectDesc : t.notConfigured}</Text>
            )}
          </BlockStack>
        </InlineStack>

        {needsReconnect && <Banner tone="warning">{t.reconnectNeeded}</Banner>}
        {account && account.lastSyncError && !needsReconnect && <Banner tone="critical">{t.syncError}</Banner>}

        {configured && (
          <InlineStack gap="200" align="start" blockAlign="center">
            {!account || needsReconnect ? (
              <Button variant="primary" onClick={onConnect} loading={busy === "connect"}>
                {account ? t.reconnect : t.connect}
              </Button>
            ) : (
              <>
                <Button icon={RefreshIcon} onClick={onSync} loading={busy === "sync"}>{t.syncNow}</Button>
                <Button variant="plain" tone="critical" onClick={onDisconnect} loading={busy === "disconnect"}>{t.disconnect}</Button>
              </>
            )}
            {account && !needsReconnect && <Text as="span" variant="bodySm" tone="subdued">{t.autoSync}</Text>}
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}
