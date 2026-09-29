import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import db from "../db.server";

const OAUTH_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const OAUTH_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com";
// Unversioned calls use the version pinned in the Meta app dashboard; set
// INSTAGRAM_GRAPH_VERSION (e.g. "v23.0") to pin it here instead.
const GRAPH_VERSION_PREFIX = process.env.INSTAGRAM_GRAPH_VERSION ? `/${process.env.INSTAGRAM_GRAPH_VERSION}` : "";
const SCOPES = "instagram_business_basic";

/** How many of the most recent posts to keep in sync per shop. */
const MAX_POSTS = 100;
/** Instagram CDN media URLs are signed and expire, so re-sync regularly. */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
/** Long-lived tokens last 60 days; refresh once fewer than this remain. */
const REFRESH_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

export class InstagramReconnectRequired extends Error {}

export function isInstagramConfigured() {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

function redirectUri() {
  return `${process.env.SHOPIFY_APP_URL || ""}/instagram/callback`;
}

// ─── OAuth state ────────────────────────────────────────────────────────────
// The state round-trips through Instagram, so it is signed: without this,
// anyone could craft a callback that attaches their Instagram account to
// someone else's shop.

function sign(value: string) {
  return createHmac("sha256", process.env.SHOPIFY_API_SECRET || "").update(value).digest("base64url");
}

function createState(shop: string) {
  const payload = Buffer.from(
    JSON.stringify({ shop, exp: Date.now() + STATE_TTL_MS, nonce: randomBytes(8).toString("hex") }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyState(state: string | null): string | null {
  if (!state) return null;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { shop, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { shop: string; exp: number };
    if (typeof shop !== "string" || Date.now() > exp) return null;
    return shop;
  } catch {
    return null;
  }
}

export function buildInstagramAuthUrl(shop: string) {
  if (!isInstagramConfigured()) throw new Error("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set");

  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    response_type: "code",
    state: createState(shop),
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

// ─── Graph API helpers ──────────────────────────────────────────────────────

// Token endpoints live at the unversioned root; everything else takes the version prefix.
const UNVERSIONED_PATHS = new Set(["/access_token", "/refresh_access_token"]);

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const version = UNVERSIONED_PATHS.has(path) ? "" : GRAPH_VERSION_PREFIX;
  const url = `${GRAPH_BASE}${version}${path}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    // Error code 190 = invalid/expired token → merchant must reconnect.
    if (text.includes('"code":190')) throw new InstagramReconnectRequired(text);
    throw new Error(`Instagram API ${path} failed (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

async function exchangeCodeForToken(code: string) {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      code,
    }),
  });
  if (!response.ok) throw new Error(`Instagram token exchange failed: ${await response.text()}`);
  const shortLived = (await response.json()) as { access_token: string };

  try {
    const longLived = await graphGet<{ access_token: string; expires_in: number }>("/access_token", {
      grant_type: "ig_exchange_token",
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      access_token: shortLived.access_token,
    });
    return { accessToken: longLived.access_token, expiresAt: new Date(Date.now() + longLived.expires_in * 1000) };
  } catch (error) {
    console.error("Instagram long-lived token exchange failed, using short-lived token (~1 hour):", error);
    return { accessToken: shortLived.access_token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) };
  }
}

export async function completeInstagramConnection(shop: string, code: string) {
  const { accessToken, expiresAt } = await exchangeCodeForToken(code);
  const profile = await graphGet<{ user_id: string; username: string; account_type?: string }>("/me", {
    fields: "user_id,username,account_type",
    access_token: accessToken,
  });

  const data = {
    igUserId: String(profile.user_id),
    username: profile.username,
    accountType: profile.account_type ?? null,
    accessToken,
    tokenExpiresAt: expiresAt,
    lastSyncError: null,
  };
  return db.instagramAccount.upsert({ where: { shop }, create: { shop, ...data }, update: data });
}

export function getInstagramAccount(shop: string) {
  return db.instagramAccount.findUnique({ where: { shop } });
}

export async function disconnectInstagram(shop: string) {
  await db.instagramPost.deleteMany({ where: { shop } });
  await db.instagramAccount.deleteMany({ where: { shop } });
}

async function ensureFreshToken(account: { shop: string; accessToken: string; tokenExpiresAt: Date }) {
  const remaining = account.tokenExpiresAt.getTime() - Date.now();
  if (remaining <= 0) throw new InstagramReconnectRequired("Instagram access token has expired");
  if (remaining > REFRESH_WITHIN_MS) return account.accessToken;

  try {
    const refreshed = await graphGet<{ access_token: string; expires_in: number }>("/refresh_access_token", {
      grant_type: "ig_refresh_token",
      access_token: account.accessToken,
    });
    await db.instagramAccount.update({
      where: { shop: account.shop },
      data: { accessToken: refreshed.access_token, tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000) },
    });
    return refreshed.access_token;
  } catch (error) {
    // Still valid for now — keep using it and retry the refresh next sync.
    console.error(`Instagram token refresh failed for ${account.shop}:`, error);
    return account.accessToken;
  }
}

interface MediaNode {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data: { media_type: string; media_url: string; thumbnail_url?: string }[] };
}

const MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}";

async function fetchRecentMedia(accessToken: string) {
  const media: MediaNode[] = [];
  let after: string | undefined;

  do {
    const page: { data: MediaNode[]; paging?: { cursors?: { after?: string }; next?: string } } = await graphGet(
      "/me/media",
      { fields: MEDIA_FIELDS, access_token: accessToken, limit: "50", ...(after ? { after } : {}) },
    );
    media.push(...page.data);
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after && media.length < MAX_POSTS);

  return media.slice(0, MAX_POSTS);
}

export async function syncInstagramPosts(shop: string) {
  const account = await getInstagramAccount(shop);
  if (!account) throw new Error(`No Instagram account connected for ${shop}`);

  try {
    const accessToken = await ensureFreshToken(account);
    // Copyrighted-audio reels come back without a media_url; they can't be displayed.
    const media = (await fetchRecentMedia(accessToken)).filter((node) => node.media_url || node.thumbnail_url);

    await db.$transaction([
      ...media.map((node) => {
        const data = {
          mediaType: node.media_type,
          mediaUrl: node.media_url || node.thumbnail_url!,
          thumbnailUrl: node.thumbnail_url ?? null,
          permalink: node.permalink,
          caption: node.caption ?? null,
          carouselChildren: node.children?.data?.length ? JSON.stringify(node.children.data) : null,
          timestamp: new Date(node.timestamp),
        };
        // `hidden` is intentionally left out of `update` so merchant choices survive re-syncs.
        return db.instagramPost.upsert({
          where: { shop_igMediaId: { shop, igMediaId: node.id } },
          create: { shop, igMediaId: node.id, ...data },
          update: data,
        });
      }),
      db.instagramPost.deleteMany({ where: { shop, igMediaId: { notIn: media.map((n) => n.id) } } }),
      db.instagramAccount.update({ where: { shop }, data: { lastSyncedAt: new Date(), lastSyncError: null } }),
    ]);

    return media.length;
  } catch (error) {
    const message = error instanceof InstagramReconnectRequired ? "reconnect" : (error as Error).message.slice(0, 1000);
    await db.instagramAccount.update({ where: { shop }, data: { lastSyncError: message } }).catch(() => {});
    throw error;
  }
}

const syncsInFlight = new Set<string>();

/**
 * Fire-and-forget re-sync when the stored media URLs are getting old. Called
 * from the storefront endpoint so feeds stay fresh without a cron job.
 */
export function syncInBackgroundIfStale(account: { shop: string; lastSyncedAt: Date | null; lastSyncError: string | null }) {
  if (!isInstagramConfigured() || account.lastSyncError === "reconnect") return;
  if (account.lastSyncedAt && Date.now() - account.lastSyncedAt.getTime() < STALE_AFTER_MS) return;
  if (syncsInFlight.has(account.shop)) return;

  syncsInFlight.add(account.shop);
  syncInstagramPosts(account.shop)
    .catch((error) => console.error(`Background Instagram sync failed for ${account.shop}:`, error))
    .finally(() => syncsInFlight.delete(account.shop));
}
