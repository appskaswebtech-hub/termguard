import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "SHOP_REDACT") {
    // Shop has been uninstalled for 48 hours; fully erase shop-owned data.
    await db.settings.deleteMany({ where: { shop } });
    await db.analyticsEvent.deleteMany({ where: { shop } });
    await db.supportMessage.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
  }

  // CUSTOMERS_DATA_REQUEST and CUSTOMERS_REDACT: TermGuard does not store
  // any customer-identifying data (no names, emails, or order data), only
  // shop-level settings and aggregate analytics, so there is nothing to
  // return or redact for an individual customer.

  return new Response();
};
