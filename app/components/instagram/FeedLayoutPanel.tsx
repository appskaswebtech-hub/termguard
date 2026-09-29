import { BlockStack, Card, InlineGrid, RangeSlider, Select, Text, TextField } from "@shopify/polaris";
import type { FeedSettings } from "../../utils/instagram-feed-types";
import { fmt, useInstagramT } from "../../utils/instagram-i18n";

interface FeedLayoutPanelProps {
  feed: FeedSettings;
  onChange: (patch: Partial<FeedSettings>) => void;
}

const LAYOUT_ICONS: Record<FeedSettings["layout"], React.ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
  slider: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="5" width="12" height="14" rx="1.5" /><rect x="0.5" y="7" width="4" height="10" rx="1" opacity=".5" /><rect x="19.5" y="7" width="4" height="10" rx="1" opacity=".5" /></svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="12" y="4.5" width="9" height="1.8" rx=".9" /><rect x="12" y="7.5" width="6" height="1.8" rx=".9" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="12" y="15.5" width="9" height="1.8" rx=".9" /><rect x="12" y="18.5" width="6" height="1.8" rx=".9" /></svg>
  ),
  floating: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="2" y="3" width="20" height="18" rx="2" opacity=".25" /><circle cx="17" cy="16" r="3.5" /></svg>
  ),
  mosaic: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="3" y="3" width="11" height="11" rx="1.5" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="16" y="9" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><rect x="9.5" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /></svg>
  ),
  masonry: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="3" y="3" width="5" height="9" rx="1" /><rect x="3" y="14" width="5" height="7" rx="1" /><rect x="9.5" y="3" width="5" height="6" rx="1" /><rect x="9.5" y="11" width="5" height="10" rx="1" /><rect x="16" y="3" width="5" height="11" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /></svg>
  ),
  reels: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="2" y="3" width="6" height="18" rx="1.5" opacity=".5" /><rect x="9" y="3" width="6" height="18" rx="1.5" /><rect x="16" y="3" width="6" height="18" rx="1.5" opacity=".5" /><path d="M11 10v4l3-2z" fill="#fff" /></svg>
  ),
  stories: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="3.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="19" cy="12" r="3.5" /></svg>
  ),
};

export default function FeedLayoutPanel({ feed, onChange }: FeedLayoutPanelProps) {
  const t = useInstagramT();
  const num = (value: string) => Number(value) || 0;

  const layouts: { value: FeedSettings["layout"]; label: string }[] = [
    { value: "grid", label: t.layoutGrid },
    { value: "mosaic", label: t.layoutMosaic },
    { value: "masonry", label: t.layoutMasonry },
    { value: "slider", label: t.layoutSlider },
    { value: "reels", label: t.layoutReels },
    { value: "stories", label: t.layoutStories },
    { value: "list", label: t.layoutList },
    { value: "floating", label: t.layoutFloating },
  ];

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">{t.layoutTitle}</Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {layouts.map((option) => {
              const active = feed.layout === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ layout: option.value })}
                  aria-pressed={active}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px",
                    borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                    border: active ? "2px solid #3B82F6" : "1.5px solid #E5E7EB",
                    background: active ? "#EFF6FF" : "#fff",
                    color: active ? "#1D4ED8" : "#6B7280",
                    transition: "all 0.15s",
                  }}
                >
                  {LAYOUT_ICONS[option.value]}
                  {option.label}
                </button>
              );
            })}
          </div>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">{t.contentTitle}</Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
            <Select
              label={t.postsToShow}
              value={feed.postsToShow}
              onChange={(value) => onChange({ postsToShow: value as FeedSettings["postsToShow"] })}
              options={[
                { label: t.postsAll, value: "all" },
                { label: t.postsInstagram, value: "instagram" },
                { label: t.postsReels, value: "reels" },
                { label: t.postsCustom, value: "custom" },
              ]}
            />
            <Select
              label={t.onPostClick}
              value={feed.onPostClick}
              onChange={(value) => onChange({ onPostClick: value as FeedSettings["onPostClick"] })}
              options={[
                { label: t.clickPopup, value: "popup" },
                { label: t.clickRedirect, value: "redirect" },
              ]}
            />
          </InlineGrid>
          <TextField
            label={t.feedTitle}
            value={feed.title}
            placeholder={t.feedTitlePlaceholder}
            onChange={(value) => onChange({ title: value })}
            maxLength={120}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">{t.appearanceTitle}</Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
            <Select
              label={t.aspectRatio}
              value={feed.aspectRatio}
              disabled={feed.postShape === "circle"}
              onChange={(value) => onChange({ aspectRatio: value as FeedSettings["aspectRatio"] })}
              options={[
                { label: "1:1 (Square)", value: "1:1" },
                { label: "4:5 (Portrait)", value: "4:5" },
                { label: "3:4 (Portrait)", value: "3:4" },
                { label: "9:16 (Reel)", value: "9:16" },
                { label: "16:9 (Landscape)", value: "16:9" },
              ]}
            />
            <Select
              label={t.postFit}
              value={feed.postFit}
              onChange={(value) => onChange({ postFit: value as FeedSettings["postFit"] })}
              options={[
                { label: t.fitCover, value: "cover" },
                { label: t.fitContain, value: "contain" },
              ]}
            />
            <Select
              label={t.shape}
              value={feed.postShape}
              onChange={(value) => onChange({ postShape: value as FeedSettings["postShape"] })}
              options={[
                { label: t.shapeRect, value: "rectangle" },
                { label: t.shapeCircle, value: "circle" },
              ]}
            />
            <Select
              label={t.postSize}
              value={feed.postSize}
              onChange={(value) => onChange({ postSize: value as FeedSettings["postSize"] })}
              options={[
                { label: t.sizeSmall, value: "small" },
                { label: t.sizeMedium, value: "medium" },
                { label: t.sizeLarge, value: "large" },
                { label: t.sizeXLarge, value: "xlarge" },
              ]}
            />
            <Select
              label={t.spacing}
              value={feed.postSpacing}
              onChange={(value) => onChange({ postSpacing: value as FeedSettings["postSpacing"] })}
              options={[
                { label: t.spacingNone, value: "none" },
                { label: t.sizeSmall, value: "small" },
                { label: t.sizeMedium, value: "medium" },
                { label: t.sizeLarge, value: "large" },
              ]}
            />
            <RangeSlider
              label={t.cornerRadius}
              value={feed.cornerRadius}
              min={0}
              max={50}
              disabled={feed.postShape === "circle"}
              output
              suffix={<span style={{ minWidth: 36, display: "inline-block", textAlign: "right" }}>{feed.cornerRadius}px</span>}
              onChange={(value) => onChange({ cornerRadius: Array.isArray(value) ? value[0] : value })}
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      {feed.layout !== "floating" && feed.layout !== "stories" && (
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">{t.gridTitle}</Text>
            <InlineGrid columns={{ xs: 2, md: 4 }} gap="300">
              <TextField label={t.rowsDesktop} type="number" min={1} max={10} value={String(feed.rowsDesktop)} onChange={(v) => onChange({ rowsDesktop: num(v) })} autoComplete="off" disabled={feed.layout === "slider" || feed.layout === "reels"} />
              <TextField label={t.colsDesktop} type="number" min={1} max={8} value={String(feed.colsDesktop)} onChange={(v) => onChange({ colsDesktop: num(v) })} autoComplete="off" />
              <TextField label={t.rowsMobile} type="number" min={1} max={10} value={String(feed.rowsMobile)} onChange={(v) => onChange({ rowsMobile: num(v) })} autoComplete="off" disabled={feed.layout !== "grid"} />
              <TextField label={t.colsMobile} type="number" min={1} max={4} value={String(feed.colsMobile)} onChange={(v) => onChange({ colsMobile: num(v) })} autoComplete="off" disabled={feed.layout === "list" || feed.layout === "mosaic"} />
            </InlineGrid>
            <Text as="p" variant="bodySm" tone="subdued">
              {feed.layout === "slider" || feed.layout === "reels"
                ? t.sliderColsHelp
                : fmt(t.gridHelp, {
                    desktop: feed.rowsDesktop * feed.colsDesktop,
                    mobile: feed.layout === "grid" ? feed.rowsMobile * feed.colsMobile : feed.rowsDesktop * feed.colsDesktop,
                  })}
            </Text>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
