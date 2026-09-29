import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// GET — poll for replies from dashboard
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const messageId = url.searchParams.get("messageId");
  const typingRole = url.searchParams.get("typing");

  if (!messageId || !process.env.DASHBOARD_URL) {
    return { replies: [], assignedAdmin: null, originalMessage: null };
  }

  if (typingRole === "admin" && process.env.DASHBOARD_API_KEY) {
    fetch(`${process.env.DASHBOARD_URL}/api/messages/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: process.env.DASHBOARD_API_KEY, messageId: Number(messageId), role: "admin" }),
    }).catch(() => {});
  }

  try {
    const res = await fetch(
      `${process.env.DASHBOARD_URL}/api/messages/replies?messageId=${messageId}`,
      { headers: { "x-api-key": process.env.DASHBOARD_API_KEY || "" } },
    );
    const data = (await res.json()) as {
      replies: { adminName: string; body: string; createdAt: string; sender?: string; attachments?: { url: string; filename: string; type: string }[] }[];
      assignedAdmin: string | null;
      shopTyping?: boolean;
      originalMessage: { body: string; createdAt: string } | null;
    };
    // Attachment URLs from the dashboard are relative to its own origin —
    // absolutize them here so the browser (a different origin entirely)
    // can actually fetch them.
    const withAbsoluteAttachments = (data.replies || []).map((reply) => ({
      ...reply,
      attachments: (reply.attachments || []).map((a) => ({
        ...a,
        url: `${process.env.DASHBOARD_URL}${a.url}`,
      })),
    }));
    return {
      replies: withAbsoluteAttachments,
      assignedAdmin: data.assignedAdmin || null,
      shopTyping: data.shopTyping || false,
      originalMessage: data.originalMessage || null,
    };
  } catch {
    return { replies: [], assignedAdmin: null, originalMessage: null };
  }
};

type ChatBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  parentId?: number | string;
};

// POST — send the first message in a new conversation, or a follow-up on an existing one
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const contentType = request.headers.get("content-type") || "";
  let body: ChatBody;
  // Attachment forwarding disabled for now — dashboard-side local-disk
  // storage doesn't survive on most production hosts.
  // let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    body = {
      name: form.get("name")?.toString(),
      email: form.get("email")?.toString(),
      subject: form.get("subject")?.toString(),
      message: form.get("message")?.toString(),
      parentId: form.get("parentId")?.toString(),
    };
    // const fileEntry = form.get("file");
    // if (fileEntry instanceof File && fileEntry.size > 0) {
    //   file = fileEntry;
    // }
  } else {
    body = await request.json();
  }

  // Follow-up: append to the existing dashboard conversation instead of
  // creating a brand-new, disconnected message.
  if (body.parentId) {
    const dashboardMessageId = Number(body.parentId);

    if (
      process.env.DASHBOARD_URL &&
      process.env.DASHBOARD_API_KEY &&
      Number.isInteger(dashboardMessageId)
    ) {
      try {
        const forward = new FormData();
        forward.set("apiKey", process.env.DASHBOARD_API_KEY);
        forward.set("messageId", String(dashboardMessageId));
        forward.set("name", body.name || "Anonymous");
        forward.set("body", body.message || "");
        // if (file) forward.set("file", file); // attachments disabled for now

        const res = await fetch(`${process.env.DASHBOARD_URL}/api/messages/follow-up`, {
          method: "POST",
          body: forward,
        });
        const result = (await res.json()) as { ok?: boolean };
        return { ok: !!result.ok, messageId: dashboardMessageId };
      } catch (e) {
        console.error("Failed to forward follow-up to dashboard", e);
        return { ok: false, messageId: dashboardMessageId };
      }
    }

    return { ok: false, messageId: dashboardMessageId };
  }

  const saved = await db.supportMessage.create({
    data: {
      shop: session.shop,
      name: body.name || "Anonymous",
      email: body.email || "",
      subject: body.subject || "Chat message",
      message: body.message || "",
    },
  });

  let dashboardMessageId: number | null = null;

  if (process.env.DASHBOARD_URL && process.env.DASHBOARD_API_KEY) {
    try {
      const res = await fetch(`${process.env.DASHBOARD_URL}/api/messages/incoming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "termguard",
          apiKey: process.env.DASHBOARD_API_KEY,
          shopMessageId: saved.id,
          shop: session.shop,
          name: body.name || "Anonymous",
          email: body.email || "",
          subject: body.subject || "Chat message",
          message: body.message || "",
        }),
      });
      const result = (await res.json()) as { messageId?: number };
      dashboardMessageId = result.messageId || null;
    } catch (e) {
      console.error("Failed to forward chat message to dashboard", e);
    }
  }

  return { ok: true, messageId: dashboardMessageId || saved.id };
};
