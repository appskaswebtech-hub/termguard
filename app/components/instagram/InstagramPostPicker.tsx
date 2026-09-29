import { useMemo, useState } from "react";
import { Badge, BlockStack, Button, ButtonGroup, Card, InlineStack, Text, Tooltip } from "@shopify/polaris";
import { HideIcon, ViewIcon } from "@shopify/polaris-icons";
import type { FeedPost } from "../../utils/instagram-feed-types";
import { fmt, useInstagramT } from "../../utils/instagram-i18n";

type AdminPost = FeedPost & { hidden: boolean };
type Filter = "all" | "shown" | "hidden";

interface InstagramPostPickerProps {
  posts: AdminPost[];
  busyId: string | null;
  autoShowNewPosts: boolean;
  onToggleHidden: (id: string) => void;
  onBulkHidden: (ids: string[], hidden: boolean) => void;
}

/** Lets the merchant choose which synced Instagram posts appear on the storefront. */
export default function InstagramPostPicker({ posts, busyId, autoShowNewPosts, onToggleHidden, onBulkHidden }: InstagramPostPickerProps) {
  const t = useInstagramT();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shownCount = posts.filter((p) => !p.hidden).length;
  const visible = useMemo(
    () => posts.filter((p) => (filter === "shown" ? !p.hidden : filter === "hidden" ? p.hidden : true)),
    [posts, filter],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyBulk = (hidden: boolean) => {
    onBulkHidden([...selected], hidden);
    setSelected(new Set());
  };

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: t.filterAll, count: posts.length },
    { id: "shown", label: t.filterShown, count: shownCount },
    { id: "hidden", label: t.filterHidden, count: posts.length - shownCount },
  ];

  return (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h2" variant="headingMd">{t.igPosts}</Text>
            {posts.length > 0 && <Badge>{fmt(t.shownCount, { shown: shownCount, total: posts.length })}</Badge>}
          </InlineStack>
          <Text as="p" variant="bodySm" tone="subdued">{t.igPostsDesc}</Text>
          {!autoShowNewPosts && (
            <Text as="p" variant="bodySm" tone="caution">{t.newPostsHiddenNote}</Text>
          )}
        </BlockStack>

        {posts.length === 0 ? (
          <Text as="p" tone="subdued">{t.igPostsEmpty}</Text>
        ) : (
          <>
            {/* Filters + bulk actions */}
            <InlineStack align="space-between" blockAlign="center" gap="200">
              <ButtonGroup variant="segmented">
                {tabs.map((tab) => (
                  <Button key={tab.id} pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>
                    {`${tab.label} (${tab.count})`}
                  </Button>
                ))}
              </ButtonGroup>
              <InlineStack gap="200" blockAlign="center">
                {selected.size > 0 ? (
                  <>
                    <Text as="span" variant="bodySm" tone="subdued">{fmt(t.selectedCount, { count: selected.size })}</Text>
                    <Button icon={ViewIcon} onClick={() => applyBulk(false)}>{t.showSelected}</Button>
                    <Button icon={HideIcon} onClick={() => applyBulk(true)}>{t.hideSelected}</Button>
                    <Button variant="plain" onClick={() => setSelected(new Set())}>{t.clearSelection}</Button>
                  </>
                ) : (
                  <Button variant="plain" onClick={() => setSelected(new Set(visible.map((p) => p.id)))}>
                    {t.selectAll}
                  </Button>
                )}
              </InlineStack>
            </InlineStack>

            {visible.length === 0 ? (
              <Text as="p" tone="subdued">{t.filterEmpty}</Text>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {visible.map((post) => {
                  const isSelected = selected.has(post.id);
                  return (
                    <div
                      key={post.id}
                      style={{
                        position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1 / 1", background: "#F3F4F6",
                        outline: isSelected ? "3px solid #3B82F6" : "none", outlineOffset: -3,
                        opacity: busyId === post.id ? 0.5 : 1, transition: "outline-color 0.15s",
                      }}
                    >
                      {/* Clicking the image selects it — the quickest way to pick many posts. */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(post.id)}
                        aria-pressed={isSelected}
                        aria-label={post.caption?.slice(0, 60) || t.igPosts}
                        style={{ display: "block", width: "100%", height: "100%", padding: 0, border: 0, cursor: "pointer", background: "none" }}
                      >
                        <img
                          src={post.thumbnailUrl || post.mediaUrl}
                          alt=""
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: post.hidden ? "grayscale(1)" : "none", opacity: post.hidden ? 0.35 : 1, transition: "all 0.2s" }}
                        />
                      </button>

                      <span
                        style={{
                          position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: 6, pointerEvents: "none",
                          border: isSelected ? "none" : "2px solid #fff", background: isSelected ? "#3B82F6" : "rgba(0,0,0,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        {isSelected && (
                          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </span>

                      {post.hidden && (
                        <div style={{ position: "absolute", bottom: 6, left: 6, pointerEvents: "none" }}><Badge>{t.hidden}</Badge></div>
                      )}

                      <div style={{ position: "absolute", bottom: 6, right: 6, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                        <Tooltip content={post.hidden ? t.show : t.hide}>
                          <Button
                            icon={post.hidden ? ViewIcon : HideIcon}
                            variant="tertiary"
                            size="slim"
                            accessibilityLabel={post.hidden ? t.show : t.hide}
                            onClick={() => onToggleHidden(post.id)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </BlockStack>
    </Card>
  );
}
