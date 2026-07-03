const THEME_API_VERSION = "2024-01";

interface ThemeAsset {
  key: string;
  value?: string;
}

function findEmbedBlock(node: unknown, uuid: string): { disabled: boolean } | null {
  if (!node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findEmbedBlock(item, uuid);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;

  if (typeof obj.type === "string" && obj.type.includes(uuid)) {
    return { disabled: obj.disabled === true };
  }

  for (const value of Object.values(obj)) {
    const found = findEmbedBlock(value, uuid);
    if (found) return found;
  }

  return null;
}

/**
 * Checks the published theme's settings_data.json for an app embed block
 * matching APP_EMBED_UUID with disabled: false.
 */
export async function isAppEmbedEnabled(
  shop: string,
  accessToken: string,
  appEmbedUuid: string,
): Promise<boolean> {
  if (!appEmbedUuid) return false;

  const themesRes = await fetch(
    `https://${shop}/admin/api/${THEME_API_VERSION}/themes.json`,
    { headers: { "X-Shopify-Access-Token": accessToken } },
  );
  if (!themesRes.ok) return false;

  const { themes } = (await themesRes.json()) as {
    themes: { id: number; role: string }[];
  };
  const mainTheme = themes?.find((t) => t.role === "main");
  if (!mainTheme) return false;

  const assetsRes = await fetch(
    `https://${shop}/admin/api/${THEME_API_VERSION}/themes/${mainTheme.id}/assets.json?asset[key]=config/settings_data.json`,
    { headers: { "X-Shopify-Access-Token": accessToken } },
  );
  if (!assetsRes.ok) return false;

  const { asset } = (await assetsRes.json()) as { asset: ThemeAsset };
  if (!asset?.value) return false;

  let settingsData: unknown;
  try {
    settingsData = JSON.parse(asset.value);
  } catch {
    return false;
  }

  const block = findEmbedBlock(settingsData, appEmbedUuid);
  return block ? !block.disabled : false;
}
