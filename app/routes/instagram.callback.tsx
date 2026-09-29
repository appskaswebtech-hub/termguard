import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import db from "../db.server";
import { completeInstagramConnection, syncInstagramPosts, verifyState } from "../utils/instagram.server";

// Instagram redirects here (top-level, outside the admin iframe) after the
// merchant approves access. Send them back into the embedded app afterwards.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = verifyState(url.searchParams.get("state"));

  if (!shop) {
    throw new Response("This Instagram connection link is invalid or has expired. Please start again from the app.", {
      status: 400,
    });
  }

  const backToApp = (status: string) =>
    redirect(`https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/instagram?instagram=${status}`);

  // The merchant clicked "Cancel" on Instagram's consent screen.
  if (url.searchParams.get("error")) return backToApp("cancelled");

  const code = url.searchParams.get("code");
  const installed = await db.session.findFirst({ where: { shop }, select: { id: true } });
  if (!code || !installed) return backToApp("error");

  try {
    await completeInstagramConnection(shop, code);
  } catch (error) {
    console.error(`Instagram connection failed for ${shop}:`, error);
    return backToApp("error");
  }

  // Connected even if the first sync fails — the merchant can retry from the app.
  await syncInstagramPosts(shop).catch((error) => console.error(`Initial Instagram sync failed for ${shop}:`, error));

  return backToApp("connected");
};
