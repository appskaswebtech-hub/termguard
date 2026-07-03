import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const VALID_LOCATIONS = new Set(["cart", "product", "collection", "custom", "checkout"]);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  let body: { shop?: string; location?: string; checked?: boolean; blocked?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const { shop, location, checked, blocked } = body;

  if (!shop || !location || !VALID_LOCATIONS.has(location)) {
    return Response.json({ error: "Invalid payload" }, { status: 400, headers: CORS_HEADERS });
  }

  const session = await db.session.findFirst({ where: { shop } });
  if (!session) {
    return Response.json({ error: "Shop not found" }, { status: 404, headers: CORS_HEADERS });
  }

  await db.analyticsEvent.create({
    data: { shop, location, checked: Boolean(checked), blocked: Boolean(blocked) },
  });

  // Count a successful checkout (checked=true, not blocked) against the free plan monthly limit
  if (checked && !blocked) {
    const settings = await db.settings.findUnique({ where: { shop } });
    if (settings && settings.plan === "free") {
      const now = new Date();
      const resetDate = settings.orderCountResetDate;
      const isNewMonth =
        resetDate.getFullYear() !== now.getFullYear() ||
        resetDate.getMonth() !== now.getMonth();

      await db.settings.update({
        where: { shop },
        data: {
          monthlyOrderCount: isNewMonth ? 1 : settings.monthlyOrderCount + 1,
          ...(isNewMonth ? { orderCountResetDate: now } : {}),
        },
      });
    }
  }

  return Response.json({ success: true }, { headers: CORS_HEADERS });
};
