import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { disconnectInstagram } from "../utils/instagram.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Don't keep a live Instagram access token for a shop that removed the app.
  // Feed settings and custom media stay until shop/redact, in case they reinstall.
  await disconnectInstagram(shop);

  return new Response();
};
