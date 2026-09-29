import { useState } from "react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  DropZone,
  InlineGrid,
  InlineStack,
  Select,
  Spinner,
  Text,
  TextField,
  Tooltip,
} from "@shopify/polaris";
import { ArrowDownIcon, ArrowUpIcon, DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import type { FeedPost } from "../../utils/instagram-feed-types";
import { useInstagramT } from "../../utils/instagram-i18n";
import InstagramPostPicker from "./InstagramPostPicker";

type AdminPost = FeedPost & { hidden: boolean };

interface MediaPanelProps {
  posts: AdminPost[];
  instagramConnected: boolean;
  uploading: boolean;
  busyId: string | null;
  onUpload: (files: File[]) => void;
  onAddUrl: (input: { url: string; mediaType: string; caption: string }) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onCaption: (id: string, caption: string) => void;
  onToggleHidden: (id: string) => void;
  onBulkHidden: (ids: string[], hidden: boolean) => void;
  autoShowNewPosts: boolean;
}

// Custom media ids are prefixed in the feed payload; actions need the raw row id.
const rawId = (post: FeedPost) => post.id.replace(/^custom-/, "");

function MediaThumb({ post, size = 72 }: { post: FeedPost; size?: number }) {
  const common: React.CSSProperties = { width: size, height: size, objectFit: "cover", borderRadius: 8, display: "block", background: "#F3F4F6", flexShrink: 0 };
  return post.mediaType === "VIDEO" && !post.thumbnailUrl ? (
    <video src={post.mediaUrl} muted playsInline preload="metadata" style={common} />
  ) : (
    <img src={post.thumbnailUrl || post.mediaUrl} alt="" loading="lazy" style={common} />
  );
}

export default function MediaPanel(props: MediaPanelProps) {
  const t = useInstagramT();
  const { posts, instagramConnected, uploading, busyId } = props;
  const custom = posts.filter((p) => p.source === "custom");
  const instagram = posts.filter((p) => p.source === "instagram");

  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [caption, setCaption] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [editing, setEditing] = useState<{ id: string; caption: string } | null>(null);

  const submitUrl = () => {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      setUrlError(t.invalidUrl);
      return;
    }
    props.onAddUrl({ url: url.trim(), mediaType, caption });
    setUrl("");
    setCaption("");
    setUrlError(undefined);
  };

  return (
    <BlockStack gap="400">
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <Card>
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">{t.uploadTitle}</Text>
              <Text as="p" variant="bodySm" tone="subdued">{t.uploadDesc}</Text>
            </BlockStack>
            <div style={{ position: "relative" }}>
              <DropZone
                accept="image/*,video/*"
                type="file"
                allowMultiple
                disabled={uploading}
                onDropAccepted={(files) => files.length && props.onUpload(files)}
              >
                <DropZone.FileUpload actionTitle={t.uploadAction} actionHint={t.uploadHint} />
              </DropZone>
              {uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 8 }}>
                  <Spinner size="small" />
                  <Text as="span" fontWeight="semibold">{t.uploading}</Text>
                </div>
              )}
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">{t.urlTitle}</Text>
            <TextField
              label={t.urlLabel}
              value={url}
              onChange={(value) => { setUrl(value); setUrlError(undefined); }}
              placeholder="https://example.com/photo.jpg"
              error={urlError}
              autoComplete="off"
            />
            <InlineGrid columns={2} gap="300">
              <Select
                label={t.mediaType}
                value={mediaType}
                onChange={setMediaType}
                options={[{ label: t.image, value: "image" }, { label: t.video, value: "video" }]}
              />
              <TextField label={t.caption} value={caption} onChange={setCaption} autoComplete="off" />
            </InlineGrid>
            <InlineStack align="end">
              <Button variant="primary" onClick={submitUrl} disabled={!url.trim()}>{t.add}</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </InlineGrid>

      <Card>
        <BlockStack gap="300">
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">{t.yourMedia}</Text>
              {custom.length > 0 && <Badge>{String(custom.length)}</Badge>}
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">{t.yourMediaDesc}</Text>
          </BlockStack>

          {custom.length === 0 ? (
            <Text as="p" tone="subdued">{t.yourMediaEmpty}</Text>
          ) : (
            <BlockStack gap="200">
              {custom.map((post, index) => {
                const id = rawId(post);
                const isEditing = editing?.id === id;
                return (
                  <div key={post.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: 10, border: "1px solid #F3F4F6", borderRadius: 10, opacity: busyId === id ? 0.5 : 1 }}>
                    <MediaThumb post={post} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <InlineStack gap="200" blockAlign="end" wrap={false}>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label={t.caption}
                              labelHidden
                              value={editing.caption}
                              onChange={(value) => setEditing({ id, caption: value })}
                              autoComplete="off"
                            />
                          </div>
                          <Button variant="primary" onClick={() => { props.onCaption(id, editing.caption); setEditing(null); }}>{t.save}</Button>
                          <Button onClick={() => setEditing(null)}>{t.cancel}</Button>
                        </InlineStack>
                      ) : (
                        <BlockStack gap="100">
                          <InlineStack gap="200">
                            <Badge tone={post.mediaType === "VIDEO" ? "info" : undefined}>{post.mediaType === "VIDEO" ? t.video : t.image}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone={post.caption ? undefined : "subdued"} truncate>
                            {post.caption || "—"}
                          </Text>
                        </BlockStack>
                      )}
                    </div>
                    {!isEditing && (
                      <InlineStack gap="100" wrap={false}>
                        <Tooltip content={t.moveUp}><Button icon={ArrowUpIcon} variant="tertiary" accessibilityLabel={t.moveUp} disabled={index === 0} onClick={() => props.onMove(id, "up")} /></Tooltip>
                        <Tooltip content={t.moveDown}><Button icon={ArrowDownIcon} variant="tertiary" accessibilityLabel={t.moveDown} disabled={index === custom.length - 1} onClick={() => props.onMove(id, "down")} /></Tooltip>
                        <Tooltip content={t.editCaption}><Button icon={EditIcon} variant="tertiary" accessibilityLabel={t.editCaption} onClick={() => setEditing({ id, caption: post.caption ?? "" })} /></Tooltip>
                        <Tooltip content={t.remove}><Button icon={DeleteIcon} variant="tertiary" tone="critical" accessibilityLabel={t.remove} onClick={() => props.onDelete(id)} /></Tooltip>
                      </InlineStack>
                    )}
                  </div>
                );
              })}
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {instagramConnected && (
        <InstagramPostPicker
          posts={instagram}
          busyId={busyId}
          autoShowNewPosts={props.autoShowNewPosts}
          onToggleHidden={props.onToggleHidden}
          onBulkHidden={props.onBulkHidden}
        />
      )}
    </BlockStack>
  );
}
