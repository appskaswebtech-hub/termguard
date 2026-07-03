import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchShopPolicyLinks } from "../utils/shop-policies.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const links = await fetchShopPolicyLinks(admin);
  return { links };
};
