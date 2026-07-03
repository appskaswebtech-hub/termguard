import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { isAppEmbedEnabled } from "../utils/theme-embed.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const enabled = await isAppEmbedEnabled(
    session.shop,
    session.accessToken!,
    process.env.APP_EMBED_UUID || "",
  );

  if (enabled) {
    await db.settings.update({
      where: { shop: session.shop },
      data: { embedEnabled: true },
    });
  }

  return { enabled };
};
