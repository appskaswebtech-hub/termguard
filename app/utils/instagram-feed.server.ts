import db from "../db.server";
import { normalizeFeed, type FeedPost, type FeedSettings } from "./instagram-feed-types";
import { deleteUploadedFile, resolveMediaUrl } from "./uploads.server";

// ─── Feed settings ──────────────────────────────────────────────────────────

export async function getFeedSettings(shop: string): Promise<FeedSettings> {
  const row = await db.instagramFeed.findUnique({ where: { shop } });
  return normalizeFeed(row ? { ...row, title: row.title ?? "" } : null);
}

export async function saveFeedSettings(shop: string, input: unknown) {
  const data = normalizeFeed(input as Partial<FeedSettings>);
  await db.instagramFeed.upsert({ where: { shop }, create: { shop, ...data }, update: data });
  return data;
}

// ─── Custom media ───────────────────────────────────────────────────────────

export function getCustomMedia(shop: string) {
  return db.instagramCustomMedia.findMany({ where: { shop }, orderBy: { position: "asc" } });
}

export async function addCustomMedia(shop: string, input: { mediaType: string; url: string; caption?: string | null }) {
  const last = await db.instagramCustomMedia.findFirst({ where: { shop }, orderBy: { position: "desc" } });
  return db.instagramCustomMedia.create({
    data: {
      shop,
      mediaType: input.mediaType === "video" ? "video" : "image",
      url: input.url,
      caption: input.caption?.slice(0, 2200) || null,
      position: (last?.position ?? -1) + 1,
    },
  });
}

export async function updateCustomMediaCaption(shop: string, id: string, caption: string) {
  await db.instagramCustomMedia.updateMany({ where: { shop, id }, data: { caption: caption.slice(0, 2200) || null } });
}

export async function deleteCustomMedia(shop: string, id: string) {
  const item = await db.instagramCustomMedia.findFirst({ where: { shop, id } });
  if (!item) return;
  await db.instagramCustomMedia.delete({ where: { id } });
  await deleteUploadedFile(item.url);
}

/** Move a custom media item one slot up or down. */
export async function moveCustomMedia(shop: string, id: string, direction: "up" | "down") {
  const items = await getCustomMedia(shop);
  const index = items.findIndex((item) => item.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return;

  const reordered = [...items];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  await db.$transaction(
    reordered.map((item, position) => db.instagramCustomMedia.update({ where: { id: item.id }, data: { position } })),
  );
}

export async function deleteAllInstagramData(shop: string) {
  const media = await getCustomMedia(shop);
  await Promise.all(media.map((item) => deleteUploadedFile(item.url)));
  await db.instagramCustomMedia.deleteMany({ where: { shop } });
  await db.instagramPost.deleteMany({ where: { shop } });
  await db.instagramAccount.deleteMany({ where: { shop } });
  await db.instagramFeed.deleteMany({ where: { shop } });
}

// ─── Posts as the storefront sees them ─────────────────────────────────────

export function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Custom media first (in the merchant's order), then Instagram posts newest
 * first. Pass includeHidden for the admin, which needs hidden posts to toggle.
 */
export async function getFeedPosts(shop: string, { includeHidden = false } = {}): Promise<(FeedPost & { hidden: boolean })[]> {
  const [custom, instagram] = await Promise.all([
    getCustomMedia(shop),
    db.instagramPost.findMany({
      where: { shop, ...(includeHidden ? {} : { hidden: false }) },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  return [
    ...custom.map((item) => {
      const url = resolveMediaUrl(item.url);
      const isVideo = item.mediaType === "video";
      return {
        id: `custom-${item.id}`,
        source: "custom" as const,
        mediaType: isVideo ? ("VIDEO" as const) : ("IMAGE" as const),
        mediaUrl: url,
        thumbnailUrl: isVideo ? null : url,
        permalink: url,
        caption: item.caption,
        carouselChildren: null,
        hidden: false,
      };
    }),
    ...instagram.map((post) => ({
      id: post.id,
      source: "instagram" as const,
      mediaType: post.mediaType as FeedPost["mediaType"],
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl,
      permalink: post.permalink,
      caption: post.caption,
      carouselChildren: post.carouselChildren ? JSON.parse(post.carouselChildren) : null,
      hidden: post.hidden,
    })),
  ];
}
