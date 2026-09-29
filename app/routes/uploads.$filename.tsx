import type { LoaderFunctionArgs } from "react-router";
import { readFile } from "fs/promises";
import path from "path";
import { resolveUploadPath, UPLOAD_CONTENT_TYPES } from "../utils/uploads.server";

// Serves merchant-uploaded Instagram feed media to the storefront.
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const filePath = resolveUploadPath(params.filename);
  if (!filePath) throw new Response("Not found", { status: 404 });

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": UPLOAD_CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    throw new Response("Not found", { status: 404 });
  }
};
