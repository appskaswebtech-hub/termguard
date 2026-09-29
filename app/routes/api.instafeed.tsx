import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { DEFAULT_FEED, filterPosts } from "../utils/instagram-feed-types";
import { getFeedPosts, getFeedSettings } from "../utils/instagram-feed.server";
import { syncInBackgroundIfStale } from "../utils/instagram.server";

// Storefront endpoint for the Instagram feed app block, reached through the
// app proxy at /apps/termguard/api/instafeed (signature-verified below).
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ posts: [], feed: DEFAULT_FEED });
  }

  const shop = session.shop;

  // Pro feature: on the free plan the block renders nothing for shoppers.
  const settings = await db.settings.findUnique({ where: { shop }, select: { plan: true } });
  if (settings?.plan !== "pro") {
    return Response.json({ posts: [], feed: DEFAULT_FEED, username: null });
  }

  const [feed, posts, account] = await Promise.all([
    getFeedSettings(shop),
    getFeedPosts(shop),
    db.instagramAccount.findUnique({
      where: { shop },
      select: { shop: true, username: true, lastSyncedAt: true, lastSyncError: true },
    }),
  ]);

  if (account) syncInBackgroundIfStale(account);

  return Response.json(
    {
      feed,
      username: account?.username ?? null,
      posts: filterPosts(posts, feed.postsToShow),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
};
