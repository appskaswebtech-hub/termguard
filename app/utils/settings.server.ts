import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { fetchShopPolicyLinks } from "./shop-policies.server";

const DEFAULT_LINKS = [
  { id: "link", label: "terms and conditions", url: "/policies/terms-of-service" },
  { id: "link-2", label: "privacy policy", url: "/policies/privacy-policy" },
];

export async function getOrCreateSettings(shop: string, admin?: AdminApiContext) {
  const existing = await db.settings.findUnique({ where: { shop } });
  if (existing) return existing;

  const links = admin ? await fetchShopPolicyLinks(admin).catch(() => DEFAULT_LINKS) : DEFAULT_LINKS;
  return db.settings.create({ data: { shop, links: links as unknown as object } });
}
