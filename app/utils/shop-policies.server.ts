import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { LinkItem } from "./settings-types";

interface ShopPolicy {
  type: string;
  title: string;
  url: string;
}

/**
 * Pulls the merchant's real Terms of Service / Privacy Policy URLs from the
 * store's configured legal pages (Settings > Policies in Shopify admin),
 * falling back to a guessed relative path if a policy isn't set up yet.
 */
export async function fetchShopPolicyLinks(admin: AdminApiContext): Promise<LinkItem[]> {
  const response = await admin.graphql(`#graphql
    query ShopPolicies {
      shop {
        shopPolicies {
          type
          title
          url
        }
      }
    }
  `);
  const { data } = await response.json();
  const policies: ShopPolicy[] = data?.shop?.shopPolicies || [];

  const find = (type: string) => policies.find((p) => p.type === type);
  const terms = find("TERMS_OF_SERVICE");
  const privacy = find("PRIVACY_POLICY");

  return [
    {
      id: "link",
      label: terms?.title || "terms and conditions",
      url: terms?.url || "/policies/terms-of-service",
    },
    {
      id: "link-2",
      label: privacy?.title || "privacy policy",
      url: privacy?.url || "/policies/privacy-policy",
    },
  ];
}
