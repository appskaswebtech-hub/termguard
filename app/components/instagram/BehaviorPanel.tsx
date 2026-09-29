import { BlockStack, Card, InlineStack, Text } from "@shopify/polaris";
import type { FeedSettings } from "../../utils/instagram-feed-types";
import { useInstagramT } from "../../utils/instagram-i18n";

interface BehaviorPanelProps {
  feed: FeedSettings;
  onChange: (patch: Partial<FeedSettings>) => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 0, padding: 0, cursor: "pointer", flexShrink: 0,
        background: checked ? "#3B82F6" : "#D1D5DB", position: "relative", transition: "background 0.15s",
      }}
    >
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.15s" }} />
    </button>
  );
}

export default function BehaviorPanel({ feed, onChange }: BehaviorPanelProps) {
  const t = useInstagramT();

  const rows: { key: "autoShowNewPosts" | "showLoadingAnimation" | "linkToOriginalPost" | "showSliderPreviews"; title: string; desc: string; icon: string }[] = [
    { key: "autoShowNewPosts", title: t.autoShowTitle, desc: t.autoShowDesc, icon: "M12 5v14M5 12h14" },
    { key: "showLoadingAnimation", title: t.loadingTitle, desc: t.loadingDesc, icon: "M12 2a10 10 0 1 0 10 10M12 6v6l4 2" },
    { key: "linkToOriginalPost", title: t.linkTitle, desc: t.linkDesc, icon: "M14 4h6v6M10 14 20 4M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" },
    { key: "showSliderPreviews", title: t.peekTitle, desc: t.peekDesc, icon: "M4 4h6v16H4zM14 4h6v16h-6z" },
  ];

  return (
    <BlockStack gap="300">
      {rows.map((row) => (
        <Card key={row.key}>
          <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
            <InlineStack gap="400" blockAlign="center" wrap={false}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#3B82F6,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={row.icon} />
                </svg>
              </div>
              <BlockStack gap="050">
                <Text as="h3" variant="headingSm">{row.title}</Text>
                <Text as="p" variant="bodySm" tone="subdued">{row.desc}</Text>
              </BlockStack>
            </InlineStack>
            <Toggle checked={feed[row.key]} label={row.title} onChange={() => onChange({ [row.key]: !feed[row.key] })} />
          </InlineStack>
        </Card>
      ))}
    </BlockStack>
  );
}
