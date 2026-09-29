import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { Banner, BlockStack, Button, ButtonGroup, Card, InlineGrid, InlineStack, Text, Toast } from "@shopify/polaris";
import { DesktopIcon, MobileIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { filterPosts, type FeedSettings } from "../utils/instagram-feed-types";
import {
  addCustomMedia,
  deleteCustomMedia,
  getFeedPosts,
  getFeedSettings,
  isSafeHttpUrl,
  moveCustomMedia,
  saveFeedSettings,
  updateCustomMediaCaption,
} from "../utils/instagram-feed.server";
import {
  buildInstagramAuthUrl,
  disconnectInstagram,
  isInstagramConfigured,
  syncInBackgroundIfStale,
  syncInstagramPosts,
} from "../utils/instagram.server";
import { saveUploadedFile, UploadError } from "../utils/uploads.server";
import { syncPlan } from "../utils/plan.server";
import { hasInstagramFeature } from "../utils/plans";
import { fmt, useInstagramT } from "../utils/instagram-i18n";
import FeedPreview from "../components/instagram/FeedPreview";
import FeedLayoutPanel from "../components/instagram/FeedLayoutPanel";
import MediaPanel from "../components/instagram/MediaPanel";
import BehaviorPanel from "../components/instagram/BehaviorPanel";
import ConnectionCard from "../components/instagram/ConnectionCard";

const MAX_FILES_PER_UPLOAD = 10;

// The Instagram feed needs the Instagram or Pro plan (development stores get everything free).
async function hasInstagramPlan(shop: string) {
  const settings = await db.settings.findUnique({ where: { shop }, select: { plan: true } });
  return hasInstagramFeature(settings?.plan);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Re-check with Shopify when not Pro, so a fresh dev-store install or a
  // just-approved subscription unlocks the page without visiting Billing first.
  const isPro = (await hasInstagramPlan(shop)) || (await syncPlan(admin, shop).then((r) => hasInstagramFeature(r.plan)).catch(() => false));
  if (!isPro) return { locked: true as const };

  const [feed, posts, account] = await Promise.all([
    getFeedSettings(shop),
    getFeedPosts(shop, { includeHidden: true }),
    db.instagramAccount.findUnique({ where: { shop } }),
  ]);

  if (account) syncInBackgroundIfStale(account);

  return {
    locked: false as const,
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    configured: isInstagramConfigured(),
    feed,
    posts,
    account: account
      ? {
          username: account.username,
          accountType: account.accountType,
          lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
          lastSyncError: account.lastSyncError,
        }
      : null,
  };
};

type ActionResult = { intent: string; ok: boolean; error?: string; authUrl?: string; count?: number };

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionResult> => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const id = String(form.get("id") || "");

  if (!(await hasInstagramPlan(shop))) return { intent, ok: false, error: "plan-required" };

  switch (intent) {
    case "saveFeed": {
      await saveFeedSettings(shop, JSON.parse(String(form.get("feed") || "{}")));
      return { intent, ok: true };
    }

    case "connect": {
      if (!isInstagramConfigured()) return { intent, ok: false, error: "not-configured" };
      return { intent, ok: true, authUrl: buildInstagramAuthUrl(shop) };
    }

    case "sync": {
      try {
        return { intent, ok: true, count: await syncInstagramPosts(shop) };
      } catch (error) {
        console.error(`Instagram sync failed for ${shop}:`, error);
        return { intent, ok: false, error: "sync-failed" };
      }
    }

    case "disconnect": {
      await disconnectInstagram(shop);
      return { intent, ok: true };
    }

    case "toggleHidden": {
      const post = await db.instagramPost.findFirst({ where: { shop, id }, select: { hidden: true } });
      if (post) await db.instagramPost.update({ where: { id }, data: { hidden: !post.hidden } });
      return { intent, ok: true };
    }

    case "bulkHidden": {
      // ids come from the merchant's selection; scoping by shop keeps it to their own posts.
      const ids = (JSON.parse(String(form.get("ids") || "[]")) as unknown[]).map(String).slice(0, 500);
      const hidden = form.get("hidden") === "true";
      if (ids.length) await db.instagramPost.updateMany({ where: { shop, id: { in: ids } }, data: { hidden } });
      return { intent, ok: true, count: ids.length };
    }

    case "addUrl": {
      const url = String(form.get("url") || "").trim();
      if (!isSafeHttpUrl(url)) return { intent, ok: false, error: "invalid-url" };
      await addCustomMedia(shop, {
        url,
        mediaType: String(form.get("mediaType") || "image"),
        caption: String(form.get("caption") || ""),
      });
      return { intent, ok: true };
    }

    case "upload": {
      const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
      try {
        for (const file of files.slice(0, MAX_FILES_PER_UPLOAD)) {
          const saved = await saveUploadedFile(file);
          await addCustomMedia(shop, saved);
        }
        return { intent, ok: true, count: files.length };
      } catch (error) {
        if (error instanceof UploadError) return { intent, ok: false, error: error.message };
        throw error;
      }
    }

    case "deleteMedia": {
      await deleteCustomMedia(shop, id);
      return { intent, ok: true };
    }

    case "moveMedia": {
      await moveCustomMedia(shop, id, form.get("direction") === "up" ? "up" : "down");
      return { intent, ok: true };
    }

    case "caption": {
      await updateCustomMediaCaption(shop, id, String(form.get("caption") || ""));
      return { intent, ok: true };
    }

    default:
      throw new Response("Unknown intent", { status: 400 });
  }
};

type EditorData = Extract<Awaited<ReturnType<typeof loader>>, { locked: false }>;

export default function InstagramFeedPage() {
  const data = useLoaderData<typeof loader>();
  return data.locked ? <ProLock /> : <InstagramFeedEditor {...(data as EditorData)} />;
}

function ProLock() {
  const t = useInstagramT();
  const features = [t.homeDesc, t.connectDesc, t.uploadTitle, t.previewTitle];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "40px 36px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px", background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(214,36,159,0.3)" }}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="#fff" />
          </svg>
        </div>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", borderRadius: 99, padding: "3px 10px", marginBottom: 10, letterSpacing: "0.04em" }}>
          {t.proBadge}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t.title}</div>
        <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>{t.proLockedDesc}</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 auto 28px", maxWidth: 440, textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
          {features.map((f) => (
            <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
              {f}
            </li>
          ))}
        </ul>
        <a href="/app/billing" style={{ display: "inline-block", background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", padding: "11px 28px", borderRadius: 9, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
          {t.proCta}
        </a>
      </div>
    </div>
  );
}

function InstagramFeedEditor({ shop, apiKey, configured, feed: savedFeed, posts, account }: EditorData) {
  const t = useInstagramT();
  const [searchParams, setSearchParams] = useSearchParams();

  const saveFetcher = useFetcher<typeof action>();
  const actionFetcher = useFetcher<typeof action>();
  const uploadFetcher = useFetcher<typeof action>();

  const [feed, setFeed] = useState<FeedSettings>(savedFeed);
  const [tab, setTab] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);

  const dirty = useMemo(() => JSON.stringify(feed) !== JSON.stringify(savedFeed), [feed, savedFeed]);
  const saving = saveFetcher.state !== "idle";

  // ── Feedback for each fetcher ────────────────────────────────────────────
  useEffect(() => {
    if (saveFetcher.state === "idle" && saveFetcher.data?.ok) setToast({ content: t.saved });
  }, [saveFetcher.state, saveFetcher.data, t.saved]);

  useEffect(() => {
    const data = actionFetcher.data;
    if (actionFetcher.state !== "idle" || !data) return;
    if (data.authUrl) {
      // Instagram's consent screen can't render inside the admin iframe.
      window.open(data.authUrl, "_top");
      return;
    }
    const messages: Record<string, string> = {
      sync: data.ok ? fmt(t.synced, { count: data.count ?? 0 }) : t.syncFailed,
      disconnect: t.disconnected,
      addUrl: data.ok ? t.added : t.invalidUrl,
      deleteMedia: t.removed,
      bulkHidden: fmt(t.bulkUpdated, { count: data.count ?? 0 }),
    };
    if (messages[data.intent]) setToast({ content: messages[data.intent], error: !data.ok });
  }, [actionFetcher.state, actionFetcher.data, t]);

  useEffect(() => {
    const data = uploadFetcher.data;
    if (uploadFetcher.state === "idle" && data) setToast({ content: data.ok ? t.uploaded : data.error || t.syncFailed, error: !data.ok });
  }, [uploadFetcher.state, uploadFetcher.data, t]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const run = (intent: string, fields: Record<string, string> = {}) =>
    actionFetcher.submit({ intent, ...fields }, { method: "POST" });

  const save = () => saveFetcher.submit({ intent: "saveFeed", feed: JSON.stringify(feed) }, { method: "POST" });

  const upload = (files: File[]) => {
    const data = new FormData();
    data.set("intent", "upload");
    files.slice(0, MAX_FILES_PER_UPLOAD).forEach((file) => data.append("file", file));
    uploadFetcher.submit(data, { method: "POST", encType: "multipart/form-data" });
  };

  const pendingIntent = actionFetcher.state !== "idle" ? String(actionFetcher.formData?.get("intent") ?? "") : null;
  const busyId = actionFetcher.state !== "idle" ? String(actionFetcher.formData?.get("id") ?? "") || null : null;
  const busyConnection = pendingIntent === "connect" || pendingIntent === "sync" || pendingIntent === "disconnect" ? pendingIntent : null;

  // Optimistic hide/show (single and bulk) so the grid responds instantly.
  const bulkIds = pendingIntent === "bulkHidden" ? String(actionFetcher.formData?.get("ids") ?? "[]") : null;
  const bulkHidden = actionFetcher.formData?.get("hidden") === "true";
  const adminPosts = useMemo(() => {
    const bulk = bulkIds ? new Set<string>(JSON.parse(bulkIds)) : null;
    return posts.map((p) => {
      if (pendingIntent === "toggleHidden" && busyId === p.id) return { ...p, hidden: !p.hidden };
      if (bulk?.has(p.id)) return { ...p, hidden: bulkHidden };
      return p;
    });
  }, [posts, pendingIntent, busyId, bulkIds, bulkHidden]);
  const previewPosts = useMemo(
    () => filterPosts(adminPosts.filter((p) => !p.hidden), feed.postsToShow),
    [adminPosts, feed.postsToShow],
  );

  const status = searchParams.get("instagram");
  const statusBanner =
    status === "connected" ? { tone: "success" as const, text: t.statusConnected }
    : status === "error" ? { tone: "critical" as const, text: t.statusError }
    : status === "cancelled" ? { tone: "info" as const, text: t.statusCancelled }
    : null;
  const clearStatus = () => {
    searchParams.delete("instagram");
    setSearchParams(searchParams, { replace: true });
  };

  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?template=index&addAppBlockId=${apiKey}/instagram-feed&target=newAppsSection`;
  const tabLabels = [t.tabLayout, t.tabMedia, t.tabBehavior];

  const saveButton = (
    <button
      onClick={save}
      disabled={!dirty || saving}
      style={{
        background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600,
        cursor: dirty && !saving ? "pointer" : "default", opacity: dirty && !saving ? 1 : 0.55, transition: "opacity 0.15s",
      }}
    >
      {saving ? t.saving : t.save}
    </button>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <a href="/app" style={{ color: "#9CA3AF", textDecoration: "none", display: "flex", alignItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </a>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.title}</div>
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", maxWidth: 620 }}>{t.subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {dirty && <span style={{ fontSize: 13, color: "#B45309", fontWeight: 500 }}>● {t.unsaved}</span>}
          {saveButton}
        </div>
      </div>

      <BlockStack gap="400">
        {statusBanner && (
          <Banner tone={statusBanner.tone} onDismiss={clearStatus}>
            {statusBanner.text}
          </Banner>
        )}

        <InlineGrid columns={{ xs: 1, md: "3fr 2fr" }} gap="400">
          <ConnectionCard
            configured={configured}
            account={account}
            busy={busyConnection as "connect" | "sync" | "disconnect" | null}
            onConnect={() => run("connect")}
            onSync={() => run("sync")}
            onDisconnect={() => window.confirm(t.disconnectConfirm) && run("disconnect")}
          />

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">{t.installTitle}</Text>
              <Text as="p" variant="bodySm" tone="subdued">{t.installDesc}</Text>
              <InlineStack>
                <Button url={themeEditorUrl} target="_blank">{t.installButton}</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Live preview */}
        <div style={{ background: "#F9FAFB", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text as="h2" variant="headingMd">{t.previewTitle}</Text>
            <ButtonGroup variant="segmented">
              <Button icon={DesktopIcon} pressed={device === "desktop"} onClick={() => setDevice("desktop")} accessibilityLabel={t.desktop}>{t.desktop}</Button>
              <Button icon={MobileIcon} pressed={device === "mobile"} onClick={() => setDevice("mobile")} accessibilityLabel={t.mobile}>{t.mobile}</Button>
            </ButtonGroup>
          </div>
          <FeedPreview feed={feed} posts={previewPosts} username={account?.username ?? null} device={device} />
        </div>

        {/* Tabs */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6", padding: "0 24px" }}>
            {tabLabels.map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "14px 20px", fontSize: 14, fontWeight: 600,
                  color: tab === i ? "#3B82F6" : "#6B7280",
                  borderBottom: tab === i ? "2px solid #3B82F6" : "2px solid transparent",
                  marginBottom: -1, transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ padding: 24 }}>
            {tab === 0 && <FeedLayoutPanel feed={feed} onChange={(patch) => setFeed((prev) => ({ ...prev, ...patch }))} />}
            {tab === 1 && (
              <MediaPanel
                posts={adminPosts}
                instagramConnected={Boolean(account)}
                uploading={uploadFetcher.state !== "idle"}
                busyId={busyId}
                onUpload={upload}
                onAddUrl={(input) => run("addUrl", input)}
                onDelete={(id) => run("deleteMedia", { id })}
                onMove={(id, direction) => run("moveMedia", { id, direction })}
                onCaption={(id, caption) => run("caption", { id, caption })}
                onToggleHidden={(id) => run("toggleHidden", { id })}
                onBulkHidden={(ids, hidden) => run("bulkHidden", { ids: JSON.stringify(ids), hidden: String(hidden) })}
                autoShowNewPosts={savedFeed.autoShowNewPosts}
              />
            )}
            {tab === 2 && <BehaviorPanel feed={feed} onChange={(patch) => setFeed((prev) => ({ ...prev, ...patch }))} />}

            {tab !== 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid #F3F4F6" }}>
                {saveButton}
              </div>
            )}
          </div>
        </div>
      </BlockStack>

      {toast && <Toast content={toast.content} error={toast.error} onDismiss={() => setToast(null)} />}
    </div>
  );
}
